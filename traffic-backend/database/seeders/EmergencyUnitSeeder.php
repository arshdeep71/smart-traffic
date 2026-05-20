<?php

namespace Database\Seeders;

use App\Models\EmergencyUnit;
use Illuminate\Database\Seeder;

class EmergencyUnitSeeder extends Seeder
{
    public function run(): void
    {
        $units = [
            // Ambulances — Ludhiana area (Punjab)
            [
                'type'         => 'ambulance',
                'unit_number'  => 'AMB-001',
                'driver_name'  => 'Ramesh Sharma',
                'driver_phone' => '+91-9812300001',
                'availability' => true,
                'status'       => 'idle',
                'location'     => ['type' => 'Point', 'coordinates' => [75.8573, 30.9010]],
            ],
            [
                'type'         => 'ambulance',
                'unit_number'  => 'AMB-002',
                'driver_name'  => 'Suresh Verma',
                'driver_phone' => '+91-9812300002',
                'availability' => true,
                'status'       => 'idle',
                'location'     => ['type' => 'Point', 'coordinates' => [75.8900, 30.9200]],
            ],
            [
                'type'         => 'ambulance',
                'unit_number'  => 'AMB-003',
                'driver_name'  => 'Kamal Singh',
                'driver_phone' => '+91-9812300003',
                'availability' => false,
                'status'       => 'en_route',
                'location'     => ['type' => 'Point', 'coordinates' => [75.8200, 30.8800]],
            ],
            // Police vehicles
            [
                'type'         => 'police',
                'unit_number'  => 'PCR-001',
                'driver_name'  => 'Inspector Harpreet',
                'driver_phone' => '+91-9812300004',
                'availability' => true,
                'status'       => 'idle',
                'location'     => ['type' => 'Point', 'coordinates' => [75.8700, 30.9100]],
            ],
            [
                'type'         => 'police',
                'unit_number'  => 'PCR-002',
                'driver_name'  => 'Inspector Deepak',
                'driver_phone' => '+91-9812300005',
                'availability' => true,
                'status'       => 'idle',
                'location'     => ['type' => 'Point', 'coordinates' => [75.8400, 30.8950]],
            ],
            // Fire brigade
            [
                'type'         => 'fire',
                'unit_number'  => 'FIRE-001',
                'driver_name'  => 'Gurpreet Gill',
                'driver_phone' => '+91-9812300006',
                'availability' => true,
                'status'       => 'idle',
                'location'     => ['type' => 'Point', 'coordinates' => [75.8600, 30.9050]],
            ],
        ];

        foreach ($units as $unit) {
            EmergencyUnit::updateOrCreate(
                ['unit_number' => $unit['unit_number']],
                $unit
            );
        }

        $this->command->info('✅ Emergency units seeded (3 ambulances, 2 police, 1 fire).');
    }
}
