<?php

use App\Http\Controllers\Api\AccidentController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EmergencyController;
use App\Http\Controllers\Api\FileController;
use App\Http\Controllers\Api\GeoController;
use App\Http\Controllers\Api\HospitalController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\TrafficController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Smart Traffic & Accident Management System — API Routes
|--------------------------------------------------------------------------
*/

// ═══════════════════════════════════════════════════════════════
// 1. AUTHENTICATION  (public)
// ═══════════════════════════════════════════════════════════════
Route::prefix('auth')->group(function () {
    Route::post('/register',       [AuthController::class, 'register']);
    Route::post('/login',          [AuthController::class, 'login']);
    Route::post('/forgot-password',[AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::post('/otp/send',       [AuthController::class, 'sendOtp']);
    Route::post('/otp/verify',     [AuthController::class, 'verifyOtp']);
    Route::post('/profile/complete', [AuthController::class, 'completeProfile']);
    Route::post('/profile/get',      [AuthController::class, 'getProfile']);
});

// ═══════════════════════════════════════════════════════════════
// 2. AUTHENTICATED ROUTES (Sanctum + status check)
// ═══════════════════════════════════════════════════════════════
Route::middleware(['auth:sanctum', 'check.status'])->group(function () {

    // ── Auth ──────────────────────────────────────────────────
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me',      [AuthController::class, 'me']);

    // ── Accidents ─────────────────────────────────────────────
    Route::prefix('accidents')->group(function () {
        Route::get('/',        [AccidentController::class, 'index']);
        Route::post('/',       [AccidentController::class, 'store']);
        Route::get('/{id}',    [AccidentController::class, 'show']);
        Route::put('/{id}',    [AccidentController::class, 'update']);
        Route::delete('/{id}', [AccidentController::class, 'destroy']);

        // Police / Admin only
        Route::middleware('role:admin,super_admin,traffic_police')->group(function () {
            Route::post('/{id}/verify',  [AccidentController::class, 'verify']);
            Route::post('/{id}/resolve', [AccidentController::class, 'resolve']);
            Route::post('/{id}/reject',  [AccidentController::class, 'reject']);
        });
    });

    // ── Traffic ───────────────────────────────────────────────
    Route::prefix('traffic')->group(function () {
        Route::get('/live',       [TrafficController::class, 'live']);
        Route::get('/roads',      [TrafficController::class, 'roads']);
        Route::get('/congested',  [TrafficController::class, 'congested']);

        Route::middleware('role:admin,super_admin,traffic_police')->group(function () {
            Route::post('/update',       [TrafficController::class, 'update']);
            Route::put('/road/{id}',     [TrafficController::class, 'updateRoad']);
        });
    });

    // ── Emergency ─────────────────────────────────────────────
    Route::prefix('emergency')->group(function () {
        Route::get('/units', [EmergencyController::class, 'units']);

        Route::middleware('role:admin,super_admin,traffic_police')->group(function () {
            Route::post('/dispatch',       [EmergencyController::class, 'dispatch']);
        });

        // Ambulance/Police staff can update their own status
        Route::put('/status/{id}', [EmergencyController::class, 'updateStatus']);
    });

    // ── Notifications ─────────────────────────────────────────
    Route::prefix('notifications')->group(function () {
        Route::get('/',             [NotificationController::class, 'index']);
        Route::put('/read/{id}',    [NotificationController::class, 'markRead']);
        Route::put('/read-all',     [NotificationController::class, 'markAllRead']);
        Route::delete('/{id}',      [NotificationController::class, 'destroy']);

        Route::middleware('role:admin,super_admin')->group(function () {
            Route::post('/send', [NotificationController::class, 'send']);
        });
    });

    // ── Geospatial ────────────────────────────────────────────
    Route::prefix('geo')->group(function () {
        Route::get('/nearby-accidents',  [GeoController::class, 'nearbyAccidents']);
        Route::get('/nearest-ambulance', [GeoController::class, 'nearestAmbulance']);
        Route::get('/accidents-in-area', [GeoController::class, 'accidentsInArea']);
    });

    // ── Analytics ─────────────────────────────────────────────
    Route::prefix('analytics')->middleware('role:admin,super_admin,traffic_police')->group(function () {
        Route::get('/accidents', [AnalyticsController::class, 'accidents']);
        Route::get('/traffic',   [AnalyticsController::class, 'traffic']);
        Route::get('/heatmap',   [AnalyticsController::class, 'heatmap']);
    });

    // ── File Upload ───────────────────────────────────────────
    Route::prefix('upload')->group(function () {
        Route::post('/image',    [FileController::class, 'uploadImage']);
        Route::delete('/{filename}', [FileController::class, 'delete'])
            ->middleware('role:admin,super_admin');
    });

    // ── Admin Panel ───────────────────────────────────────────
    Route::prefix('admin')->middleware('role:admin,super_admin')->group(function () {
        Route::get('/dashboard',      [AdminController::class, 'dashboard']);
        Route::get('/users',          [AdminController::class, 'users']);
        Route::put('/users/{id}',     [AdminController::class, 'updateUser']);
        Route::delete('/users/{id}',  [AdminController::class, 'deleteUser']);
        Route::get('/audit-logs',     [AdminController::class, 'auditLogs']);
    });

    // ── Hospital Management (Admin/Super Admin — full CRUD) ───
    Route::prefix('hospitals')->middleware('role:admin,super_admin')->group(function () {
        Route::get('/overview',         [HospitalController::class, 'overview']);
        Route::get('/',                 [HospitalController::class, 'index']);
        Route::post('/',                [HospitalController::class, 'store']);
        Route::get('/{id}',             [HospitalController::class, 'show']);
        Route::put('/{id}',             [HospitalController::class, 'update']);
        Route::delete('/{id}',          [HospitalController::class, 'destroy']);

        // Admin can see hospital employees & ambulances
        Route::get('/{id}/employees',           [HospitalController::class, 'employees']);
        Route::get('/{id}/ambulances',          [HospitalController::class, 'ambulances']);
        Route::get('/{id}/dashboard',           [HospitalController::class, 'dashboard']);

        // Admin can also manage employees / ambulances
        Route::post('/{id}/employees',              [HospitalController::class, 'storeEmployee']);
        Route::put('/{id}/employees/{eid}',         [HospitalController::class, 'updateEmployee']);
        Route::delete('/{id}/employees/{eid}',      [HospitalController::class, 'deleteEmployee']);
        Route::post('/{id}/ambulances',             [HospitalController::class, 'storeAmbulance']);
        Route::put('/{id}/ambulances/{aid}',        [HospitalController::class, 'updateAmbulance']);
        Route::delete('/{id}/ambulances/{aid}',     [HospitalController::class, 'deleteAmbulance']);
    });

    // ── Hospital Admin Portal — scoped to own hospital only ───
    Route::prefix('hospital-admin')->middleware('role:hospital_admin')->group(function () {
        Route::get('/hospital',                     [HospitalController::class, 'index']);
        Route::get('/hospital/{id}',                [HospitalController::class, 'show']);
        Route::put('/hospital/{id}',                [HospitalController::class, 'update']);
        Route::get('/hospital/{id}/dashboard',      [HospitalController::class, 'dashboard']);
        Route::get('/hospital/{id}/employees',      [HospitalController::class, 'employees']);
        Route::post('/hospital/{id}/employees',     [HospitalController::class, 'storeEmployee']);
        Route::put('/hospital/{id}/employees/{eid}',   [HospitalController::class, 'updateEmployee']);
        Route::delete('/hospital/{id}/employees/{eid}',[HospitalController::class, 'deleteEmployee']);
        Route::get('/hospital/{id}/ambulances',     [HospitalController::class, 'ambulances']);
        Route::post('/hospital/{id}/ambulances',    [HospitalController::class, 'storeAmbulance']);
        Route::put('/hospital/{id}/ambulances/{aid}',  [HospitalController::class, 'updateAmbulance']);
        Route::delete('/hospital/{id}/ambulances/{aid}',[HospitalController::class, 'deleteAmbulance']);
    });

    // ── Hospital Staff/Driver Self-Portal ─────────────────────
    Route::prefix('hospital')->middleware('role:hospital_driver,hospital_staff')->group(function () {
        Route::get('/me',                  [HospitalController::class, 'staffMe']);
        Route::put('/me/status',           [HospitalController::class, 'updateMyStatus']);
        Route::post('/me/gps',             [HospitalController::class, 'updateGps']);
        Route::post('/me/sos',             [HospitalController::class, 'triggerSos']);
        Route::get('/me/emergency',        [HospitalController::class, 'activeEmergency']);
        Route::put('/me/emergency-stage',  [HospitalController::class, 'updateEmergencyStage']);
    });
});

// ═══════════════════════════════════════════════════════════════
// API Health Check  (public)
// ═══════════════════════════════════════════════════════════════
Route::get('/health', fn () => response()->json([
    'status'  => 'ok',
    'service' => 'Smart Traffic & Accident Management System',
    'version' => '1.0.0',
    'time'    => now()->toIso8601String(),
]));

// Temporary debug route — remove in production
Route::get('/debug-auth', function (\Illuminate\Http\Request $request) {
    // ... logic removed for brevity
});

// ── Catch-all Login Route for Unauthenticated Requests ──────
Route::get('/login', function () {
    return response()->json([
        'success' => false,
        'message' => 'Unauthenticated. Please login via /api/auth/login to get a token.'
    ], 401);
})->name('login');
