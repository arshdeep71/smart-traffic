<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Accident extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'accidents';

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'severity',       // low | medium | high
        'status',         // pending | verified | emergency_dispatched | resolved | rejected
        'images',         // array of file paths
        'location',       // GeoJSON Point { type: 'Point', coordinates: [lng, lat] }
        'assigned_unit',  // ObjectId of emergency unit
        'verified_by',    // admin user id
        'resolved_at',
        'rejection_reason',
        'witness_count',
        'vehicle_involved',
        'trust_score',
        'assigned_driver_id',
        'assigned_driver_name',
        'ambulance_number',
        'hospital_name',
        'pickup_time',
        'handover_time',
        'reached_scene_time',
        'reached_hospital_time',
        'pickup_coords',
        'handover_coords',
        'pickup_address',
        'handover_address',
        'reporter_name',
        'reporter_email',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
        'created_at'  => 'datetime',
        'updated_at'  => 'datetime',
    ];

    // Status constants
    const STATUS_PENDING             = 'pending';
    const STATUS_VERIFIED            = 'verified';
    const STATUS_EMERGENCY_DISPATCHED = 'emergency_dispatched';
    const STATUS_RESOLVED            = 'resolved';
    const STATUS_REJECTED            = 'rejected';

    // Severity constants
    const SEVERITY_LOW    = 'low';
    const SEVERITY_MEDIUM = 'medium';
    const SEVERITY_HIGH   = 'high';

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function emergencyUnit()
    {
        return $this->belongsTo(EmergencyUnit::class, 'assigned_unit');
    }

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeVerified($query)
    {
        return $query->where('status', self::STATUS_VERIFIED);
    }

    public function scopeHighSeverity($query)
    {
        return $query->where('severity', self::SEVERITY_HIGH);
    }
}
