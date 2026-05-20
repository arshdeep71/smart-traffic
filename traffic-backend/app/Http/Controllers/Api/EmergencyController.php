<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Accident;
use App\Models\AuditLog;
use App\Models\EmergencyUnit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmergencyController extends Controller
{
    // GET /api/emergency/units
    public function units(Request $request): JsonResponse
    {
        $query = EmergencyUnit::query();

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->has('available')) {
            $query->where('availability', (bool) $request->available);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $units = $query->get();

        return response()->json([
            'success' => true,
            'count'   => $units->count(),
            'data'    => $units,
        ]);
    }

    // POST /api/emergency/dispatch  (Admin/Police)
    public function dispatch(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'accident_id' => 'required|string',
            'unit_type'   => 'required|in:ambulance,police,fire',
            'unit_id'     => 'nullable|string',  // optional: force specific unit
        ]);

        $accident = Accident::findOrFail($validated['accident_id']);

        if ($accident->status === Accident::STATUS_RESOLVED) {
            return response()->json([
                'success' => false,
                'message' => 'Accident is already resolved.',
            ], 422);
        }

        // Find unit: specific or nearest available
        if (! empty($validated['unit_id'])) {
            $unit = EmergencyUnit::findOrFail($validated['unit_id']);
        } else {
            $unit = $this->findNearestAvailableUnit(
                $validated['unit_type'],
                $accident->location['coordinates'] ?? null
            );
        }

        if (! $unit) {
            return response()->json([
                'success' => false,
                'message' => 'No available ' . $validated['unit_type'] . ' units at this time.',
            ], 422);
        }

        // Assign unit to accident
        $unit->update([
            'availability'        => false,
            'status'              => EmergencyUnit::STATUS_EN_ROUTE,
            'current_accident_id' => $accident->id,
        ]);

        $accident->update([
            'status'        => Accident::STATUS_EMERGENCY_DISPATCHED,
            'assigned_unit' => $unit->id,
        ]);

        AuditLog::record("dispatched_{$validated['unit_type']}", 'emergency', $accident->id, [], [
            'unit_id'   => $unit->id,
            'unit_type' => $unit->type,
        ]);

        return response()->json([
            'success' => true,
            'message' => ucfirst($validated['unit_type']) . ' dispatched successfully.',
            'data'    => [
                'accident' => $accident->fresh(),
                'unit'     => $unit->fresh(),
            ],
        ]);
    }

    // PUT /api/emergency/status/{id}
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'status'   => 'required|in:idle,assigned,en_route,completed',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude'=> 'nullable|numeric|between:-180,180',
        ]);

        $unit = EmergencyUnit::findOrFail($id);
        $old = $unit->toArray();

        $updateData = ['status' => $request->status];

        // Update live location if provided
        if ($request->filled('latitude') && $request->filled('longitude')) {
            $updateData['location'] = [
                'type'        => 'Point',
                'coordinates' => [(float) $request->longitude, (float) $request->latitude],
            ];
        }

        // Auto-set availability when completing
        if ($request->status === EmergencyUnit::STATUS_IDLE) {
            $updateData['availability']        = true;
            $updateData['current_accident_id'] = null;
        } elseif ($request->status === EmergencyUnit::STATUS_COMPLETED) {
            $updateData['availability']        = false;
        }

        $unit->update($updateData);

        AuditLog::record('unit_status_updated', 'emergency', $id, $old, $unit->fresh()->toArray());

        return response()->json([
            'success' => true,
            'message' => 'Unit status updated.',
            'data'    => $unit->fresh(),
        ]);
    }

    // ─── Private: GeoSpatial nearest-unit finder ─────────────────
    private function findNearestAvailableUnit(string $type, ?array $coordinates): ?EmergencyUnit
    {
        $query = EmergencyUnit::available()->where('type', $type);

        // If accident has coordinates, sort by distance using MongoDB $nearSphere
        if ($coordinates && count($coordinates) === 2) {
            [$lng, $lat] = $coordinates;
            // Raw MongoDB near query
            $query->whereRaw([
                'location' => [
                    '$nearSphere' => [
                        '$geometry' => [
                            'type'        => 'Point',
                            'coordinates' => [$lng, $lat],
                        ],
                        '$maxDistance' => 500000, // 500 km radius for testing purposes
                    ],
                ],
            ]);
        }

        return $query->first();
    }
}
