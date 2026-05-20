<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Hospital extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'hospitals';

    protected $fillable = [
        'name',
        'code',
        'address',
        'city',
        'state',
        'emergency_contact',
        'hospital_type',
        'ambulance_capacity',
        'email',
        'admin_login_id',
        'admin_user_id',
        'admin_password_hint',
        'status',
    ];

    protected $casts = [
        'ambulance_capacity' => 'integer',
        'created_at'         => 'datetime',
        'updated_at'         => 'datetime',
    ];

    // Status constants
    const STATUS_ACTIVE    = 'active';
    const STATUS_SUSPENDED = 'suspended';
    const STATUS_INACTIVE  = 'inactive';

    // Type constants
    const TYPE_GENERAL   = 'general';
    const TYPE_TRAUMA    = 'trauma';
    const TYPE_SPECIALTY = 'specialty';
    const TYPE_CLINIC    = 'clinic';

    public function adminUser()
    {
        return $this->belongsTo(User::class, 'admin_user_id');
    }

    public function employees()
    {
        return $this->hasMany(HospitalEmployee::class, 'hospital_id');
    }

    public function ambulances()
    {
        return $this->hasMany(HospitalAmbulance::class, 'hospital_id');
    }
}
