<?php

namespace Database\Seeders;

use App\Models\Hospital;
use App\Models\HospitalAmbulance;
use App\Models\HospitalEmployee;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class HospitalSeeder extends Seeder
{
    public function run(): void
    {
        $hospitals = [
            [
                'name'              => 'Amritsar Emergency Hospital',
                'code'              => 'AMR-HOSP-001',
                'address'           => 'Lawrence Road, Near Civil Lines',
                'city'              => 'Amritsar',
                'state'             => 'Punjab',
                'emergency_contact' => '+91-9100000101',
                'hospital_type'     => 'trauma',
                'ambulance_capacity'=> 10,
                'email'             => 'admin@amritsar-hospital.local',
                'admin_login_id'    => 'amritsar-hospital-admin',
                'admin_password'    => 'Password@123',
            ],
            [
                'name'              => 'Chandigarh City Medical Center',
                'code'              => 'CHD-HOSP-001',
                'address'           => 'Sector 32, Medical District',
                'city'              => 'Chandigarh',
                'state'             => 'Punjab',
                'emergency_contact' => '+91-9100000201',
                'hospital_type'     => 'general',
                'ambulance_capacity'=> 15,
                'email'             => 'admin@chandigarh-hospital.local',
                'admin_login_id'    => 'chandigarh-hospital-admin',
                'admin_password'    => 'Password@123',
            ],
        ];

        foreach ($hospitals as $hData) {
            // Skip if already exists
            if (Hospital::where('code', $hData['code'])->exists()) {
                continue;
            }

            // Create admin user
            $adminUser = User::create([
                'name'        => $hData['name'] . ' Admin',
                'email'       => $hData['admin_login_id'],
                'phone'       => $hData['emergency_contact'],
                'password'    => Hash::make($hData['admin_password']),
                'role'        => 'hospital_admin',
                'status'      => 'active',
            ]);

            // Create hospital
            $hospital = Hospital::create([
                'name'               => $hData['name'],
                'code'               => $hData['code'],
                'address'            => $hData['address'],
                'city'               => $hData['city'],
                'state'              => $hData['state'],
                'emergency_contact'  => $hData['emergency_contact'],
                'hospital_type'      => $hData['hospital_type'],
                'ambulance_capacity' => $hData['ambulance_capacity'],
                'email'              => $hData['email'],
                'admin_login_id'     => $hData['admin_login_id'],
                'admin_user_id'      => (string)$adminUser->_id,
                'status'             => 'active',
            ]);

            // Link hospital back to admin
            $adminUser->update(['hospital_id' => (string)$hospital->_id]);

            // Create 3 sample employees per hospital
            $cityCode = strtoupper(substr(preg_replace('/\s+/', '', $hData['city']), 0, 3));
            $employees = [
                [
                    'role'       => 'ambulance_driver',
                    'login_id'   => strtolower($hData['city']) . '-driver-01',
                    'full_name'  => 'Driver ' . $hData['city'] . ' 01',
                    'dept'       => 'Emergency Transport',
                    'emp_prefix' => 'DRV',
                    'user_role'  => 'hospital_driver',
                ],
                [
                    'role'       => 'paramedic',
                    'login_id'   => strtolower($hData['city']) . '-paramedic-01',
                    'full_name'  => 'Paramedic ' . $hData['city'] . ' 01',
                    'dept'       => 'Emergency Care',
                    'emp_prefix' => 'PMD',
                    'user_role'  => 'hospital_staff',
                ],
                [
                    'role'       => 'hospital_operator',
                    'login_id'   => strtolower($hData['city']) . '-operator-01',
                    'full_name'  => 'Operator ' . $hData['city'] . ' 01',
                    'dept'       => 'Operations',
                    'emp_prefix' => 'OPR',
                    'user_role'  => 'hospital_staff',
                ],
            ];

            foreach ($employees as $i => $empData) {
                if (User::where('email', $empData['login_id'])->exists()) {
                    continue;
                }
                $empUser = User::create([
                    'name'        => $empData['full_name'],
                    'email'       => $empData['login_id'],
                    'phone'       => '+91-910000' . rand(1000, 9999),
                    'password'    => Hash::make('Password@123'),
                    'role'        => $empData['user_role'],
                    'status'      => 'active',
                    'hospital_id' => (string)$hospital->_id,
                ]);

                HospitalEmployee::create([
                    'hospital_id'        => (string)$hospital->_id,
                    'user_id'            => (string)$empUser->_id,
                    'employee_id'        => "{$cityCode}-{$empData['emp_prefix']}-00" . ($i + 1),
                    'full_name'          => $empData['full_name'],
                    'role'               => $empData['role'],
                    'phone'              => '+91-910000' . rand(1000, 9999),
                    'department'         => $empData['dept'],
                    'login_id'           => $empData['login_id'],
                    'shift_status'       => 'off_duty',
                    'operational_status' => 'available',
                    'account_status'     => 'active',
                ]);
            }

            // Create 2 sample ambulances per hospital
            for ($j = 1; $j <= 2; $j++) {
                HospitalAmbulance::create([
                    'hospital_id'  => (string)$hospital->_id,
                    'ambulance_id' => "AMB-{$cityCode}-0{$j}",
                    'plate_number' => 'PB-' . rand(10, 99) . '-' . rand(1000, 9999),
                    'status'       => 'available',
                    'gps_status'   => 'active',
                    'fuel_level'   => rand(70, 100),
                    'health_status'=> 'good',
                ]);
            }
        }

        $this->command->info('✅ Hospitals seeded with admin accounts, staff, and ambulances.');
        $this->command->info('   Hospital Admin logins: amritsar-hospital-admin / chandigarh-hospital-admin');
        $this->command->info('   All passwords: Password@123');
    }
}
