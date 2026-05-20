<?php

namespace Database\Seeders;

use App\Models\EmergencyUnit;
use App\Models\TrafficReport;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            EmergencyUnitSeeder::class,
            TrafficReportSeeder::class,
            HospitalSeeder::class,
        ]);
    }
}
