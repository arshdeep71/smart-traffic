<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Accident;
use App\Models\EmergencyUnit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GeoController extends Controller
{
    /**
     * GET /api/geo/nearby-accidents
     * Find accidents within a radius using MongoDB $nearSphere
     */
    public function nearbyAccidents(Request $request): JsonResponse
    {
        $request->validate([
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'radius_km' => 'nullable|numeric|min:0.1|max:100',
            'status'    => 'nullable|string',
        ]);

        $lat      = (float) $request->latitude;
        $lng      = (float) $request->longitude;
        $radiusM  = ((float) $request->get('radius_km', 5)) * 1000; // km → metres

        $query = Accident::whereRaw([
            'location' => [
                '$nearSphere' => [
                    '$geometry' => [
                        'type'        => 'Point',
                        'coordinates' => [$lng, $lat],
                    ],
                    '$maxDistance' => $radiusM,
                ],
            ],
        ]);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $accidents = $query->limit(50)->get([
            'title', 'severity', 'status', 'location', 'created_at',
        ]);

        return response()->json([
            'success'   => true,
            'radius_km' => $request->get('radius_km', 5),
            'center'    => ['lat' => $lat, 'lng' => $lng],
            'count'     => $accidents->count(),
            'data'      => $accidents,
        ]);
    }

    /**
     * GET /api/geo/nearest-ambulance
     * Find the nearest available ambulance using $nearSphere
     */
    public function nearestAmbulance(Request $request): JsonResponse
    {
        $request->validate([
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'type'      => 'nullable|in:ambulance,police,fire',
        ]);

        $lat  = (float) $request->latitude;
        $lng  = (float) $request->longitude;
        $type = $request->get('type', 'ambulance');

        $unit = EmergencyUnit::where('availability', true)
            ->where('type', $type)
            ->whereRaw([
                'location' => [
                    '$nearSphere' => [
                        '$geometry' => [
                            'type'        => 'Point',
                            'coordinates' => [$lng, $lat],
                        ],
                        '$maxDistance' => 100000, // 100 km max search
                    ],
                ],
            ])
            ->first(['type', 'unit_number', 'driver_name', 'driver_phone', 'status', 'location']);

        if (! $unit) {
            return response()->json([
                'success' => false,
                'message' => "No available {$type} found within 100 km.",
            ], 404);
        }

        // Calculate approx distance (Haversine not needed — MongoDB already sorted nearest first)
        return response()->json([
            'success' => true,
            'data'    => $unit,
        ]);
    }

    /**
     * GET /api/geo/accidents-in-area
     * Filter accidents within a bounding box (for map viewport)
     */
    public function accidentsInArea(Request $request): JsonResponse
    {
        $request->validate([
            'sw_lat' => 'required|numeric', // south-west corner
            'sw_lng' => 'required|numeric',
            'ne_lat' => 'required|numeric', // north-east corner
            'ne_lng' => 'required|numeric',
        ]);

        $accidents = Accident::whereRaw([
            'location' => [
                '$geoWithin' => [
                    '$box' => [
                        [(float) $request->sw_lng, (float) $request->sw_lat],
                        [(float) $request->ne_lng, (float) $request->ne_lat],
                    ],
                ],
            ],
        ])->get(['title', 'severity', 'status', 'location', 'created_at']);

        return response()->json([
            'success' => true,
            'count'   => $accidents->count(),
            'data'    => $accidents,
        ]);
    }
}
