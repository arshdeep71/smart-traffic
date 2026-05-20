<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class HospitalAmbulance extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'hospital_ambulances';

    protected $fillable = [
        'hospital_id',
        'ambulance_id',     // e.g. AMB-AMR-01
        'plate_number',
        'assigned_driver_id', // HospitalEmployee._id
        'status',           // available | dispatched | maintenance | offline | emergency_active
        'gps_status',       // active | inactive
        'fuel_level',       // percentage
        'health_status',    // good | maintenance_due | critical
        'current_assignment_id', // Accident._id if dispatched
        'location',         // GeoJSON Point
    ];

    protected $casts = [
        'fuel_level'  => 'integer',
        'created_at'  => 'datetime',
        'updated_at'  => 'datetime',
    ];

    // Status constants
    const STATUS_AVAILABLE       = 'available';
    const STATUS_DISPATCHED      = 'dispatched';
    const STATUS_MAINTENANCE     = 'maintenance';
    const STATUS_OFFLINE         = 'offline';
    const STATUS_EMERGENCY_ACTIVE = 'emergency_active';

    public function hospital()
    {
        return $this->belongsTo(Hospital::class, 'hospital_id');
    }

    public function driver()
    {
        return $this->belongsTo(HospitalEmployee::class, 'assigned_driver_id');
    }
}
