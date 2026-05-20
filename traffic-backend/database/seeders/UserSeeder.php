<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'name'   => 'Super Admin',
                'email'  => 'superadmin@traffic.local',
                'phone'  => '+91-9000000001',
                'role'   => 'super_admin',
                'status' => 'active',
            ],
            [
                'name'   => 'Admin User',
                'email'  => 'admin@traffic.local',
                'phone'  => '+91-9000000002',
                'role'   => 'admin',
                'status' => 'active',
            ],
            [
                'name'   => 'Inspector Rajan',
                'email'  => 'police@traffic.local',
                'phone'  => '+91-9000000003',
                'role'   => 'traffic_police',
                'status' => 'active',
            ],
            [
                'name'   => 'Driver Amit Kumar',
                'email'  => 'ambulance@traffic.local',
                'phone'  => '+91-9000000004',
                'role'   => 'ambulance_staff',
                'status' => 'active',
            ],
            [
                'name'   => 'Citizen Priya',
                'email'  => 'citizen@traffic.local',
                'phone'  => '+91-9000000005',
                'role'   => 'citizen',
                'status' => 'active',
            ],
        ];

        foreach ($users as $userData) {
            User::updateOrCreate(
                ['email' => $userData['email']],
                array_merge($userData, ['password' => Hash::make('Password@123')])
            );
        }

        $this->command->info('✅ Users seeded. Default password: Password@123');
    }
}
