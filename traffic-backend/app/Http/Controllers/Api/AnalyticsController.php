<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Accident;
use App\Models\Analytics;
use App\Models\TrafficReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    // GET /api/analytics/accidents
    public function accidents(Request $request): JsonResponse
    {
        $days = (int) $request->get('days', 30);
        $from = now()->subDays($days);

        // Accident frequency by severity
        $bySeverity = Accident::where('created_at', '>=', $from)
            ->raw(fn ($col) => $col->aggregate([
                ['$group' => ['_id' => '$severity', 'count' => ['$sum' => 1]]],
                ['$sort'  => ['count' => -1]],
            ]))->toArray();

        // Accident frequency by status
        $byStatus = Accident::where('created_at', '>=', $from)
            ->raw(fn ($col) => $col->aggregate([
                ['$group' => ['_id' => '$status', 'count' => ['$sum' => 1]]],
            ]))->toArray();

        // Daily trend (accidents per day)
        $dailyTrend = Accident::where('created_at', '>=', $from)
            ->raw(fn ($col) => $col->aggregate([
                ['$group' => [
                    '_id'   => ['$dateToString' => ['format' => '%Y-%m-%d', 'date' => '$created_at']],
                    'count' => ['$sum' => 1],
                ]],
                ['$sort' => ['_id' => 1]],
            ]))->toArray();

        // High-severity peak hours
        $peakHours = Accident::where('severity', 'high')
            ->where('created_at', '>=', $from)
            ->raw(fn ($col) => $col->aggregate([
                ['$group' => [
                    '_id'   => ['$hour' => '$created_at'],
                    'count' => ['$sum' => 1],
                ]],
                ['$sort' => ['count' => -1]],
                ['$limit' => 5],
            ]))->toArray();

        return response()->json([
            'success'   => true,
            'period'    => "{$days} days",
            'data'      => [
                'by_severity' => $bySeverity,
                'by_status'   => $byStatus,
                'daily_trend' => $dailyTrend,
                'peak_hours'  => $peakHours,
                'total'       => Accident::where('created_at', '>=', $from)->count(),
            ],
        ]);
    }

    // GET /api/analytics/traffic
    public function traffic(Request $request): JsonResponse
    {
        // Top congested roads
        $topCongested = TrafficReport::orderByDesc('congestion_level')
            ->limit(10)
            ->get(['road_name', 'congestion_level', 'vehicle_count', 'average_speed', 'status']);

        // Average metrics
        $avgMetrics = TrafficReport::raw(fn ($col) => $col->aggregate([
            ['$group' => [
                '_id'               => null,
                'avg_congestion'    => ['$avg' => '$congestion_level'],
                'avg_speed'         => ['$avg' => '$average_speed'],
                'total_vehicles'    => ['$sum' => '$vehicle_count'],
            ]],
        ]))->first();

        // Road status breakdown
        $statusBreakdown = TrafficReport::raw(fn ($col) => $col->aggregate([
            ['$group' => ['_id' => '$status', 'count' => ['$sum' => 1]]],
        ]))->toArray();

        return response()->json([
            'success' => true,
            'data'    => [
                'top_congested_roads' => $topCongested,
                'averages'            => $avgMetrics,
                'status_breakdown'    => $statusBreakdown,
            ],
        ]);
    }

    // GET /api/analytics/heatmap
    public function heatmap(Request $request): JsonResponse
    {
        $type = $request->get('type', 'accidents'); // accidents | congestion

        if ($type === 'accidents') {
            $points = Accident::whereNotNull('location')
                ->where('created_at', '>=', now()->subDays(30))
                ->get(['location', 'severity'])
                ->map(function ($acc) {
                    $coords = $acc->location['coordinates'] ?? null;
                    return $coords ? [
                        'lat'      => $coords[1],
                        'lng'      => $coords[0],
                        'weight'   => match ($acc->severity) {
                            'high'   => 3,
                            'medium' => 2,
                            default  => 1,
                        },
                    ] : null;
                })
                ->filter()
                ->values();
        } else {
            // Congestion heatmap
            $points = TrafficReport::whereNotNull('location')
                ->get(['location', 'congestion_level'])
                ->map(function ($r) {
                    $coords = $r->location['coordinates'] ?? null;
                    return $coords ? [
                        'lat'    => $coords[1],
                        'lng'    => $coords[0],
                        'weight' => round($r->congestion_level / 33), // 0–3 scale
                    ] : null;
                })
                ->filter()
                ->values();
        }

        return response()->json([
            'success' => true,
            'type'    => $type,
            'count'   => $points->count(),
            'data'    => $points,
        ]);
    }
}
