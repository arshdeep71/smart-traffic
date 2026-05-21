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

        // Handle image uploads
        $imagePaths = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $path = $image->store('accidents/images', 'public');
                $imagePaths[] = $path;
            }
        }

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
}
