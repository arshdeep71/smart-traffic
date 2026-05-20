<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class HospitalEmployee extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'hospital_employees';

    protected $fillable = [
        'hospital_id',
        'user_id',         // Reference to User._id
        'employee_id',     // e.g. AMR-DRV-007
        'full_name',
        'role',            // ambulance_driver | emergency_responder | hospital_operator | paramedic | medical_staff
        'phone',
        'department',
        'login_id',        // e.g. amritsar-driver-07
        'assigned_ambulance_id',
        'shift_status',    // on_duty | off_duty | on_break
        'operational_status', // available | dispatched | offline
        'account_status',  // active | suspended
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Role constants
    const ROLE_DRIVER    = 'ambulance_driver';
    const ROLE_RESPONDER = 'emergency_responder';
    const ROLE_OPERATOR  = 'hospital_operator';
    const ROLE_PARAMEDIC = 'paramedic';
    const ROLE_MEDICAL   = 'medical_staff';

    public function hospital()
    {
        return $this->belongsTo(Hospital::class, 'hospital_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function assignedAmbulance()
    {
        return $this->belongsTo(HospitalAmbulance::class, 'assigned_ambulance_id');
    }
}
