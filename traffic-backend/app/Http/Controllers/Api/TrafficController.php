<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\TrafficReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrafficController extends Controller
{
    // GET /api/traffic/live
    public function live(): JsonResponse
    {
        $reports = TrafficReport::orderByDesc('updated_at')
            ->limit(50)
            ->get()
            ->map(function ($report) {
                return [
                    'id'               => $report->id,
                    'road_name'        => $report->road_name,
                    'vehicle_count'    => $report->vehicle_count,
                    'average_speed'    => $report->average_speed,
                    'congestion_level' => $report->congestion_level,
                    'congestion_label' => $report->congestion_label,
                    'status'           => $report->status,
                    'location'         => $report->location,
                    'updated_at'       => $report->updated_at,
                ];
            });

        return response()->json([
            'success'    => true,
            'count'      => $reports->count(),
            'data'       => $reports,
            'fetched_at' => now(),
        ]);
    }

    // GET /api/traffic/roads
    public function roads(Request $request): JsonResponse
    {
        $query = TrafficReport::query();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('min_congestion')) {
            $query->where('congestion_level', '>=', (int) $request->min_congestion);
        }

        $roads = $query->orderBy('road_name')->paginate(20);

        return response()->json([
            'success' => true,
            'data'    => $roads,
        ]);
    }

    // POST /api/traffic/update  (Police/Admin)
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'road_name'        => 'required|string|max:100',
            'vehicle_count'    => 'required|integer|min:0',
            'average_speed'    => 'required|numeric|min:0',
            'congestion_level' => 'required|integer|between:0,100',
            'status'           => 'required|in:open,congested,blocked,under_maintenance',
            'latitude'         => 'nullable|numeric|between:-90,90',
            'longitude'        => 'nullable|numeric|between:-180,180',
            'weather_condition'=> 'nullable|in:clear,rain,fog,snow',
            'incident_nearby'  => 'nullable|boolean',
        ]);

        // Upsert by road_name to avoid duplicates
        $report = TrafficReport::updateOrCreate(
            ['road_name' => $validated['road_name']],
            [
                'vehicle_count'    => $validated['vehicle_count'],
                'average_speed'    => $validated['average_speed'],
                'congestion_level' => $validated['congestion_level'],
                'status'           => $validated['status'],
                'weather_condition'=> $validated['weather_condition'] ?? 'clear',
                'incident_nearby'  => $validated['incident_nearby'] ?? false,
                'reported_by'      => auth()->id() ?? 'system',
                'location'         => isset($validated['latitude']) ? [
                    'type'        => 'Point',
                    'coordinates' => [(float) $validated['longitude'], (float) $validated['latitude']],
                ] : null,
            ]
        );

        AuditLog::record('traffic_updated', 'traffic', $report->id);

        return response()->json([
            'success' => true,
            'message' => 'Traffic data updated.',
            'data'    => $report,
        ]);
    }

    // PUT /api/traffic/road/{id}  (Admin only)
    public function updateRoad(Request $request, string $id): JsonResponse
    {
        $road = TrafficReport::findOrFail($id);

        $validated = $request->validate([
            'status'           => 'sometimes|in:open,congested,blocked,under_maintenance',
            'congestion_level' => 'sometimes|integer|between:0,100',
            'vehicle_count'    => 'sometimes|integer|min:0',
            'average_speed'    => 'sometimes|numeric|min:0',
        ]);

        $old = $road->toArray();
        $road->update($validated);

        AuditLog::record('road_status_updated', 'traffic', $id, $old, $road->fresh()->toArray());

        return response()->json([
            'success' => true,
            'message' => 'Road updated.',
            'data'    => $road->fresh(),
        ]);
    }

    // GET /api/traffic/congested  — hotspot roads
    public function congested(): JsonResponse
    {
        $roads = TrafficReport::congested()
            ->orderByDesc('congestion_level')
            ->get(['road_name', 'congestion_level', 'vehicle_count', 'average_speed', 'location', 'status']);

        return response()->json([
            'success' => true,
            'count'   => $roads->count(),
            'data'    => $roads,
        ]);
    }
}
