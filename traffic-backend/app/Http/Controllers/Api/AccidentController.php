<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Accident;
use App\Models\AuditLog;
use App\Models\EmergencyUnit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AccidentController extends Controller
{
    // GET /api/accidents
    public function index(Request $request): JsonResponse
    {
        $query = Accident::query();

        // Filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('severity')) {
            $query->where('severity', $request->severity);
        }
        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', $request->date_to);
        }

        $accidents = $query->with('user')->orderByDesc('created_at')
            ->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data'    => $accidents,
        ]);
    }

    // POST /api/accidents
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'            => 'required|string|max:200',
            'description'      => 'required|string|max:2000',
            'severity'         => 'required|in:low,medium,high',
            'latitude'         => 'required|numeric|between:-90,90',
            'longitude'        => 'required|numeric|between:-180,180',
            'images.*'         => 'nullable|file|mimes:jpg,jpeg,png,pdf,mp4,webm,quicktime|max:20480',
            'witness_count'    => 'nullable|integer|min:0',
            'vehicle_involved' => 'nullable|string',
            'trust_score'      => 'nullable|numeric|between:0,100',
        ]);

        // Handle image uploads (Supabase Storage with automatic Local Storage fallback)
        $imagePaths = [];
        if ($request->hasFile('images')) {
            $supabaseUrl = env('SUPABASE_URL');
            $supabaseKey = env('SUPABASE_KEY');
            $bucketName = env('SUPABASE_BUCKET', 'evidence');

            \Illuminate\Support\Facades\Log::info('[SUPABASE UPLOAD] Start processing ' . count($request->file('images')) . ' images/videos.');
            \Illuminate\Support\Facades\Log::info('[SUPABASE CONFIG] URL: ' . ($supabaseUrl ?: 'MISSING') . ' | KEY present: ' . ($supabaseKey ? 'YES' : 'NO') . ' | BUCKET: ' . $bucketName);

            foreach ($request->file('images') as $index => $image) {
                $originalName = $image->getClientOriginalName();
                $extension = $image->getClientOriginalExtension();
                $mimeType = $image->getMimeType();
                $size = $image->getSize();
                
                \Illuminate\Support\Facades\Log::info("[SUPABASE UPLOAD] Processing File #{$index}: Name={$originalName}, Ext={$extension}, Mime={$mimeType}, Size={$size} bytes");

                if ($supabaseUrl && $supabaseKey) {
                    try {
                        $filename = 'accidents/images/' . uniqid() . '.' . $extension;
                        \Illuminate\Support\Facades\Log::info("[SUPABASE UPLOAD] Attempting cloud upload to path: {$filename} in bucket: {$bucketName}");

                        // Upload directly to Supabase Storage API using Laravel's Http facade with raw body
                        $fileContents = file_get_contents($image->getRealPath());
                        $fileSize = strlen($fileContents);
                        
                        \Illuminate\Support\Facades\Log::info("[SUPABASE UPLOAD] Uploading raw body: Name={$originalName}, Size={$fileSize} bytes, Mime={$mimeType}");

                        $response = \Illuminate\Support\Facades\Http::withHeaders([
                            'Authorization' => 'Bearer ' . $supabaseKey,
                            'apikey'        => $supabaseKey,
                            'Content-Type'  => $mimeType,
                        ])->withBody(
                            $fileContents,
                            $mimeType
                        )->post($supabaseUrl . '/storage/v1/object/' . $bucketName . '/' . $filename);

                        \Illuminate\Support\Facades\Log::info("[SUPABASE UPLOAD] Response status code: " . $response->status() . " | Body: " . $response->body());
                        
                        if ($response->successful()) {
                            // Format public URL
                            $publicUrl = $supabaseUrl . '/storage/v1/object/public/' . $bucketName . '/' . $filename;
                            $imagePaths[] = $publicUrl;
                            \Illuminate\Support\Facades\Log::info("[SUPABASE UPLOAD] Success! Saved URL: " . $publicUrl);
                        } else {
                            \Illuminate\Support\Facades\Log::error("[SUPABASE UPLOAD] Failed with response: " . $response->body());
                            
                            // Fallback to local
                            $path = $image->store('accidents/images', 'public');
                            $imagePaths[] = $path;
                            
                            $fullPath = storage_path('app/public/' . $path);
                            $savedSize = file_exists($fullPath) ? filesize($fullPath) : 0;
                            \Illuminate\Support\Facades\Log::warning("[SUPABASE FALLBACK] Triggered local storage fallback. Saved local path: " . $path . " | Size: " . $savedSize . " bytes");
                        }
                    } catch (\Exception $e) {
                        \Illuminate\Support\Facades\Log::error("[SUPABASE UPLOAD EXCEPTION] Exception message: " . $e->getMessage() . "\n" . $e->getTraceAsString());
                        
                        // Fallback on exception
                        $path = $image->store('accidents/images', 'public');
                        $imagePaths[] = $path;
                        
                        $fullPath = storage_path('app/public/' . $path);
                        $savedSize = file_exists($fullPath) ? filesize($fullPath) : 0;
                        \Illuminate\Support\Facades\Log::warning("[SUPABASE FALLBACK] Triggered local storage fallback due to exception. Saved local path: " . $path . " | Size: " . $savedSize . " bytes");
                    }
                } else {
                    // Fallback to local storage if credentials are not configured
                    $path = $image->store('accidents/images', 'public');
                    $imagePaths[] = $path;
                    
                    $fullPath = storage_path('app/public/' . $path);
                    $savedSize = file_exists($fullPath) ? filesize($fullPath) : 0;
                    \Illuminate\Support\Facades\Log::warning("[SUPABASE CONFIG MISSING] SUPABASE_URL or SUPABASE_KEY not loaded in environment. Fallback to local path: " . $path . " | Size: " . $savedSize . " bytes");
                }
            }
        }

        $repName = $request->input('reporter_name');
        $repEmail = $request->input('reporter_email');
        \Illuminate\Support\Facades\Log::info("[BACKEND CITIZEN IDENTITY] Received on Request: Name={$repName}, Email={$repEmail}");

        $accident = Accident::create([
            'user_id'          => auth()->id(),
            'title'            => $validated['title'],
            'description'      => $validated['description'],
            'severity'         => $validated['severity'],
            'status'           => Accident::STATUS_PENDING,
            'images'           => $imagePaths,
            'location'         => [
                'type'        => 'Point',
                'coordinates' => [(float) $validated['longitude'], (float) $validated['latitude']],
            ],
            'witness_count'    => $validated['witness_count'] ?? 0,
            'vehicle_involved' => $validated['vehicle_involved'] ?? null,
            'trust_score'      => $validated['trust_score'] ?? 0,
        ]);

        // Explicitly set and save again to force MongoDB persistence
        $accident->reporter_name = $repName;
        $accident->reporter_email = $repEmail;
        $accident->save();

        \Illuminate\Support\Facades\Log::info("[BACKEND CITIZEN IDENTITY] Final saved in MongoDB: Name={$accident->reporter_name}, Email={$accident->reporter_email}");

        AuditLog::record('accident_reported', 'accident', $accident->id);

        return response()->json([
            'success' => true,
            'message' => 'Accident reported successfully.',
            'data'    => $accident,
        ], 201);
    }

    // GET /api/accidents/{id}
    public function show(string $id): JsonResponse
    {
        $accident = Accident::with('user')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => $accident,
        ]);
    }

    // PUT /api/accidents/{id}
    public function update(Request $request, string $id): JsonResponse
    {
        $accident = Accident::findOrFail($id);

        // Relax check to allow authenticated responders/drivers to log active transport progress
        if (!auth()->check()) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $validated = $request->validate([
            'title'                 => 'sometimes|string|max:200',
            'description'           => 'sometimes|string|max:2000',
            'severity'              => 'sometimes|in:low,medium,high',
            'status'                => 'sometimes|string',
            'assigned_driver_id'    => 'sometimes|string|nullable',
            'assigned_driver_name'  => 'sometimes|string|nullable',
            'ambulance_number'      => 'sometimes|string|nullable',
            'hospital_name'         => 'sometimes|string|nullable',
            'pickup_time'           => 'sometimes|string|nullable',
            'handover_time'         => 'sometimes|string|nullable',
            'reached_scene_time'    => 'sometimes|string|nullable',
            'reached_hospital_time' => 'sometimes|string|nullable',
            'pickup_coords'         => 'sometimes|array|nullable',
            'handover_coords'       => 'sometimes|array|nullable',
            'pickup_address'        => 'sometimes|string|nullable',
            'handover_address'      => 'sometimes|string|nullable',
        ]);

        $old = $accident->toArray();
        $accident->update($validated);

        AuditLog::record('accident_updated', 'accident', $id, $old, $accident->fresh()->toArray());

        return response()->json([
            'success' => true,
            'message' => 'Accident updated.',
            'data'    => $accident->fresh(),
        ]);
    }

    // DELETE /api/accidents/{id}
    public function destroy(string $id): JsonResponse
    {
        $accident = Accident::findOrFail($id);

        if (auth()->id() !== $accident->user_id && ! auth()->user()->isAdmin()) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        // Remove uploaded images
        foreach ($accident->images ?? [] as $img) {
            Storage::disk('public')->delete($img);
        }

        AuditLog::record('accident_deleted', 'accident', $id);
        $accident->delete();

        return response()->json([
            'success' => true,
            'message' => 'Accident deleted.',
        ]);
    }

    // POST /api/accidents/{id}/verify  (Admin only)
    public function verify(Request $request, string $id): JsonResponse
    {
        $accident = Accident::findOrFail($id);

        if ($accident->status !== Accident::STATUS_PENDING) {
            return response()->json([
                'success' => false,
                'message' => 'Only pending accidents can be verified.',
            ], 422);
        }

        $old = $accident->toArray();
        $accident->update([
            'status'      => Accident::STATUS_VERIFIED,
            'verified_by' => auth()->id(),
        ]);

        AuditLog::record('accident_verified', 'accident', $id, $old, ['status' => Accident::STATUS_VERIFIED]);

        return response()->json([
            'success' => true,
            'message' => 'Accident verified.',
            'data'    => $accident->fresh(),
        ]);
    }

    // POST /api/accidents/{id}/resolve  (Admin/Police only)
    public function resolve(Request $request, string $id): JsonResponse
    {
        $accident = Accident::findOrFail($id);

        $old = $accident->toArray();
        $accident->update([
            'status'      => Accident::STATUS_RESOLVED,
            'resolved_at' => now(),
        ]);

        // Free up the assigned emergency unit
        if ($accident->assigned_unit) {
            EmergencyUnit::where('_id', $accident->assigned_unit)->update([
                'availability'        => true,
                'status'              => EmergencyUnit::STATUS_IDLE,
                'current_accident_id' => null,
            ]);
        }

        AuditLog::record('accident_resolved', 'accident', $id, $old, ['status' => Accident::STATUS_RESOLVED]);

        return response()->json([
            'success' => true,
            'message' => 'Accident resolved.',
            'data'    => $accident->fresh(),
        ]);
    }

    // POST /api/accidents/{id}/reject  (Admin only)
    public function reject(Request $request, string $id): JsonResponse
    {
        $request->validate(['reason' => 'required|string|max:500']);

        $accident = Accident::findOrFail($id);
        $old = $accident->toArray();

        $accident->update([
            'status'           => Accident::STATUS_REJECTED,
            'rejection_reason' => $request->reason,
        ]);

        AuditLog::record('accident_rejected', 'accident', $id, $old, ['status' => Accident::STATUS_REJECTED]);

        return response()->json([
            'success' => true,
            'message' => 'Accident report rejected.',
            'data'    => $accident->fresh(),
        ]);
    }

    // POST /api/accidents/{id}/accept-police (Police only)
    public function acceptPolice(string $id): JsonResponse
    {
        $accident = Accident::findOrFail($id);
        
        \Illuminate\Support\Facades\Log::info("[POLICE TRACKING] Accepting case: {$id} by User: " . auth()->id());

        $accident->status = 'Police Assigned';
        $accident->assigned_police_id = auth()->id();
        $accident->tracking_active = true;
        $accident->police_status = 'Police Assigned';
        $accident->ETA = 5;
        $accident->tracking_session_id = uniqid('pol_track_');
        // Initial location set to LPU Police Point [lng, lat]
        $accident->police_live_location = [75.6980, 31.2592];
        $accident->save();

        \Illuminate\Support\Facades\Log::info("[POLICE TRACKING] Case accepted successfully! Session: " . $accident->tracking_session_id);

        return response()->json([
            'success' => true,
            'message' => 'Accident accepted by Police Patrol.',
            'data'    => $accident->fresh(),
        ]);
    }

    // POST /api/accidents/{id}/update-police-location (Police only)
    public function updatePoliceLocation(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'latitude'  => 'required|numeric',
            'longitude' => 'required|numeric',
            'heading'   => 'nullable|numeric',
        ]);

        $accident = Accident::findOrFail($id);
        
        \Illuminate\Support\Facades\Log::info("[POLICE TRACKING] Received Live Coordinates for Case {$id}: Lat={$request->latitude}, Lng={$request->longitude}");

        $accident->police_live_location = [ (float)$request->longitude, (float)$request->latitude ];
        
        // Simple dynamic ETA calculation based on distance to LPU Block 38
        $destLat = 31.252243;
        $destLng = 75.703131;
        $dist = sqrt(pow($request->latitude - $destLat, 2) + pow($request->longitude - $destLng, 2)) * 111.32; // rough distance in km
        $accident->ETA = max(1, round($dist * 2)); // roughly 2 min per km
        
        $accident->save();

        return response()->json([
            'success' => true,
            'message' => 'Police live location updated.',
            'data'    => $accident->fresh(),
        ]);
    }

    // POST /api/accidents/{id}/update-police-status (Police only)
    public function updatePoliceStatus(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|string',
        ]);

        $accident = Accident::findOrFail($id);
        
        \Illuminate\Support\Facades\Log::info("[POLICE TRACKING] Update status for Case {$id} to: {$request->status}");

        $accident->police_status = $request->status;
        
        // Sync the general accident status to match
        if (in_array(strtolower($request->status), ['officer en route', 'officer nearby', 'officer reached scene', 'investigation active'])) {
            $accident->status = $request->status;
        }

        if (strtolower($request->status) === 'officer reached scene') {
            $accident->reached_scene_time = now()->toTimeString();
        }

        $accident->save();

        return response()->json([
            'success' => true,
            'message' => 'Police tracking status updated.',
            'data'    => $accident->fresh(),
        ]);
    }
}
