<?php

namespace Database\Seeders;

use App\Models\TrafficReport;
use Illuminate\Database\Seeder;

class TrafficReportSeeder extends Seeder
{
    public function run(): void
    {
        $roads = [
            [
                'road_name'        => 'NH44 - Jalandhar Bypass',
                'vehicle_count'    => 420,
                'average_speed'    => 18.5,
                'congestion_level' => 88,
                'status'           => 'congested',
                'weather_condition'=> 'clear',
                'incident_nearby'  => true,
                'location'         => ['type' => 'Point', 'coordinates' => [75.9110, 31.5140]],
            ],
            [
                'road_name'        => 'Ferozepur Road',
                'vehicle_count'    => 310,
                'average_speed'    => 35.0,
                'congestion_level' => 62,
                'status'           => 'congested',
                'weather_condition'=> 'clear',
                'incident_nearby'  => false,
                'location'         => ['type' => 'Point', 'coordinates' => [75.8200, 30.8700]],
            ],
            [
                'road_name'        => 'GT Road Ludhiana',
                'vehicle_count'    => 530,
                'average_speed'    => 12.0,
                'congestion_level' => 95,
                'status'           => 'blocked',
                'weather_condition'=> 'fog',
                'incident_nearby'  => true,
                'location'         => ['type' => 'Point', 'coordinates' => [75.8500, 30.9100]],
            ],
            [
                'road_name'        => 'Pakhowal Road',
                'vehicle_count'    => 90,
                'average_speed'    => 55.0,
                'congestion_level' => 22,
                'status'           => 'open',
                'weather_condition'=> 'clear',
                'incident_nearby'  => false,
                'location'         => ['type' => 'Point', 'coordinates' => [75.8800, 30.9300]],
            ],
            [
                'road_name'        => 'Chandigarh Road',
                'vehicle_count'    => 200,
                'average_speed'    => 40.0,
                'congestion_level' => 45,
                'status'           => 'open',
                'weather_condition'=> 'clear',
                'incident_nearby'  => false,
                'location'         => ['type' => 'Point', 'coordinates' => [75.9000, 30.9500]],
            ],
            [
                'road_name'        => 'BRS Nagar Link Road',
                'vehicle_count'    => 0,
                'average_speed'    => 0,
                'congestion_level' => 0,
                'status'           => 'under_maintenance',
                'weather_condition'=> 'clear',
                'incident_nearby'  => false,
                'location'         => ['type' => 'Point', 'coordinates' => [75.8600, 30.8850]],
            ],
        ];

        foreach ($roads as $road) {
            TrafficReport::updateOrCreate(
                ['road_name' => $road['road_name']],
                array_merge($road, ['reported_by' => 'system'])
            );
        }

        $this->command->info('✅ Traffic reports seeded (6 roads with varied congestion).');
    }
}
