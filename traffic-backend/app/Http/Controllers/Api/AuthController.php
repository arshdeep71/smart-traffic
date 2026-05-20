<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Models\CitizenOtp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    // ─── Register ───────────────────────────────────────────────
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:100',
            'email'    => 'required|email|unique:mongodb.users,email',
            'phone'    => 'nullable|string|max:20',
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
            'role'     => 'sometimes|in:citizen,traffic_police,ambulance_staff',
        ]);

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'phone'    => $validated['phone'] ?? null,
            'password' => Hash::make($validated['password']),
            'role'     => $validated['role'] ?? 'citizen',
            'status'   => 'active',
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        AuditLog::record('user_registered', 'auth', $user->id);

        return response()->json([
            'success' => true,
            'message' => 'Registration successful.',
            'data'    => [
                'user'         => $this->userResource($user),
                'access_token' => $token,
                'token_type'   => 'Bearer',
            ],
        ], 201);
    }

    // ─── Login ───────────────────────────────────────────────────
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        // Self-healing: if default background citizen is missing on a fresh database, create it dynamically
        if ($request->email === 'citizen@traffic.local' && !$user) {
            $user = User::create([
                'name'     => 'Local Citizen',
                'email'    => 'citizen@traffic.local',
                'password' => Hash::make('Password@123'),
                'role'     => 'citizen',
                'status'   => 'active',
            ]);
        }

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials.',
            ], 401);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Account suspended. Contact administrator.',
            ], 403);
        }

        // Revoke old tokens (single session)
        $user->tokens()->delete();
        $token = $user->createToken('auth_token')->plainTextToken;

        AuditLog::record('user_login', 'auth', $user->id);

        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
            'data'    => [
                'user'         => $this->userResource($user),
                'access_token' => $token,
                'token_type'   => 'Bearer',
            ],
        ]);
    }

    // ─── Logout ──────────────────────────────────────────────────
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        AuditLog::record('user_logout', 'auth', $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully.',
        ]);
    }

    // ─── Me ──────────────────────────────────────────────────────
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $this->userResource($request->user()),
        ]);
    }

    // ─── Forgot Password ─────────────────────────────────────────
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        if (! $user) {
            // Security: don't reveal email existence
            return response()->json([
                'success' => true,
                'message' => 'If that email exists, a reset link has been sent.',
            ]);
        }

        $token = Str::random(64);
        $user->update([
            'reset_token'            => Hash::make($token),
            'reset_token_expires_at' => now()->addMinutes(30),
        ]);

        // Log reset token (in real app, send via email)
        AuditLog::record('password_reset_requested', 'auth', $user->id);

        return response()->json([
            'success' => true,
            'message' => 'Password reset token generated.',
            // Remove 'token' from response in production — send via email
            'debug_token' => app()->isLocal() ? $token : null,
        ]);
    }

    // ─── Reset Password ──────────────────────────────────────────
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'token'    => 'required|string',
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! $user->reset_token || now()->gt($user->reset_token_expires_at)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired reset token.',
            ], 422);
        }

        if (! Hash::check($request->token, $user->reset_token)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid reset token.',
            ], 422);
        }

        $user->update([
            'password'               => Hash::make($request->password),
            'reset_token'            => null,
            'reset_token_expires_at' => null,
        ]);
        $user->tokens()->delete();

        AuditLog::record('password_reset_completed', 'auth', $user->id);

        return response()->json([
            'success' => true,
            'message' => 'Password reset successfully. Please login.',
        ]);
    }

    // ─── OTP System for Citizen Signups ──────────────────────────
    public function sendOtp(Request $request): JsonResponse
    {
        \Log::info("[DEBUG OTP] sendOtp route hit with request payload: " . json_encode($request->all()));

        $validator = \Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            $errorMsg = implode(', ', $validator->errors()->all());
            \Log::warning("[DEBUG OTP] Validation failed for request. Errors: " . $errorMsg);
            return response()->json([
                'success' => false,
                'message' => 'Validation failed: ' . $errorMsg,
                'errors' => $validator->errors()
            ], 422);
        }

        $email = trim($request->email);
        \Log::info("[DEBUG OTP] Validation passed for email: {$email}");

        // Check if there is a recent pending OTP sent in the last 60 seconds (spam prevention)
        $recentOtp = CitizenOtp::where('email', $email)
            ->where('status', 'pending')
            ->where('created_at', '>=', now()->subSeconds(60))
            ->first();

        if ($recentOtp) {
            \Log::warning("[DEBUG OTP] Rate limit hit for {$email}. Tried requesting within 60s.");
            return response()->json([
                'success' => false,
                'message' => 'Please wait 60 seconds before requesting another verification code.',
            ], 429);
        }

        // Mark any previous pending OTPs as expired
        \Log::info("[DEBUG OTP] Invalidating old pending OTP records for {$email}");
        CitizenOtp::where('email', $email)
            ->where('status', 'pending')
            ->update(['status' => 'expired']);

        // Generate secure 6-digit OTP
        \Log::info("[DEBUG OTP] OTP generation started for: {$email}");
        try {
            $otp = sprintf("%06d", random_int(100000, 999999));
        } catch (\Exception $e) {
            $otp = sprintf("%06d", mt_rand(100000, 999999));
        }
        \Log::info("[DEBUG OTP] OTP generated: {$otp}");
        
        // Store securely with 10 minutes expiry
        CitizenOtp::create([
            'email'      => $email,
            'otp'        => $otp,
            'expires_at' => now()->addMinutes(10),
            'status'     => 'pending',
            'attempts'   => 0,
        ]);

        // Send email via SMTP - REAL SMTP ONLY (NO FALLBACK)
        \Log::info("[DEBUG OTP] Attempting Resend SMTP send to {$email}");
        try {
            Mail::raw("Your SmartTraffic verification code is: {$otp}", function ($message) use ($email) {
                $message->to($email)
                        ->subject('Verify your SmartTraffic Account');
            });
            \Log::info("[DEBUG OTP] Mail sent successfully to {$email}");
        } catch (\Exception $e) {
            \Log::error("[DEBUG OTP] Mail failed for {$email}. Error: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'SMTP mail delivery failed: ' . $e->getMessage()
            ], 500);
        }

        \Log::info("[DEBUG OTP] sendOtp returning success for {$email}");
        return response()->json([
            'success' => true,
            'message' => 'Verification code sent successfully. Please check your inbox.',
            // Return otp in local dev for easier debugging / testing
            'debug_otp' => app()->isLocal() ? $otp : null,
        ]);
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'otp'   => 'required|string|size:6',
        ]);

        $email = trim($request->email);
        $otp = trim($request->otp);

        // Find the active pending OTP for this email
        $dbOtp = CitizenOtp::where('email', $email)
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->first();

        if (! $dbOtp) {
            return response()->json([
                'success' => false,
                'message' => 'No active verification request found. Please request a new code.',
            ], 404);
        }

        // Check if expired (over 10 minutes)
        if (now()->gt($dbOtp->expires_at)) {
            $dbOtp->update(['status' => 'expired']);
            return response()->json([
                'success' => false,
                'message' => 'OTP expired. Please request a new code.',
            ], 422);
        }

        // Limit verification attempts to prevent brute-forcing
        if ($dbOtp->attempts >= 5) {
            $dbOtp->update(['status' => 'expired']);
            return response()->json([
                'success' => false,
                'message' => 'Too many failed attempts. This verification code has been invalidated.',
            ], 429);
        }

        // Check code
        if ($dbOtp->otp !== $otp) {
            $dbOtp->increment('attempts');
            return response()->json([
                'success' => false,
                'message' => 'Invalid verification code. Please try again.',
            ], 422);
        }

        // OTP is correct! Mark as verified
        $dbOtp->update(['status' => 'verified']);

        return response()->json([
            'success' => true,
            'message' => 'Email verified successfully!',
        ]);
    }

    // ─── Complete Citizen Safety Profile (Persist to MongoDB) ─────
    public function completeProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'             => 'required|email',
            'name'              => 'required|string|max:100',
            'phone'             => 'nullable|string|max:20',
            'emergency_contact' => 'nullable|string|max:20',
        ]);

        $email = trim($validated['email']);

        // Find user by email or create/update them in MongoDB
        $user = User::where('email', $email)->first();

        if (! $user) {
            // If they signed up via Supabase, we sync/create their user record in MongoDB here!
            $user = User::create([
                'name'              => $validated['name'],
                'email'             => $email,
                'phone'             => $validated['phone'] ?? null,
                'role'              => 'citizen',
                'status'            => 'active',
                'profile_completed' => true,
                'emergency_contact' => $validated['emergency_contact'] ?? null,
                'onboarding_completed' => true,
            ]);
        } else {
            $user->update([
                'name'              => $validated['name'],
                'phone'             => $validated['phone'] ?? $user->phone,
                'profile_completed' => true,
                'emergency_contact' => $validated['emergency_contact'] ?? $user->emergency_contact,
                'onboarding_completed' => true,
            ]);
        }

        AuditLog::record('profile_completed', 'auth', $user->id);

        return response()->json([
            'success' => true,
            'message' => 'Safety profile updated successfully in MongoDB.',
            'data'    => $this->userResource($user),
        ]);
    }

    // ─── Get Citizen Safety Profile (Read from MongoDB) ───────────
    public function getProfile(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $email = trim($request->email);
        $user = User::where('email', $email)->first();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Profile not found in MongoDB.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $this->userResource($user),
        ]);
    }

    // ─── Private helper ──────────────────────────────────────────
    private function userResource(User $user): array
    {
        return [
            'id'                 => $user->id,
            'name'               => $user->name,
            'email'              => $user->email,
            'phone'              => $user->phone,
            'role'               => $user->role,
            'status'             => $user->status,
            'hospital_id'        => $user->hospital_id ?? null,
            'email_verified_at'  => $user->email_verified_at,
            'created_at'         => $user->created_at,
            'profile_completed'  => (bool) ($user->profile_completed ?? false),
            'emergency_contact'  => $user->emergency_contact ?? '',
            'onboarding_completed' => (bool) ($user->onboarding_completed ?? false),
        ];
    }
}
