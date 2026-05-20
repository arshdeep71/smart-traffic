<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class EmergencyUnit extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'emergency_units';

    protected $fillable = [
        'type',          // ambulance | police | fire
        'unit_number',
        'driver_name',
        'driver_phone',
        'availability',  // boolean
        'status',        // idle | assigned | en_route | completed
        'location',      // GeoJSON Point { type: 'Point', coordinates: [lng, lat] }
        'current_accident_id',
    ];

    protected $casts = [
        'availability' => 'boolean',
        'created_at'   => 'datetime',
        'updated_at'   => 'datetime',
    ];

    // Status constants
    const STATUS_IDLE      = 'idle';
    const STATUS_ASSIGNED  = 'assigned';
    const STATUS_EN_ROUTE  = 'en_route';
    const STATUS_COMPLETED = 'completed';

    // Type constants
    const TYPE_AMBULANCE = 'ambulance';
    const TYPE_POLICE    = 'police';
    const TYPE_FIRE      = 'fire';

    public function scopeAvailable($query)
    {
        return $query->where('availability', true)->where('status', self::STATUS_IDLE);
    }

    public function scopeAmbulances($query)
    {
        return $query->where('type', self::TYPE_AMBULANCE);
    }

    public function scopePolice($query)
    {
        return $query->where('type', self::TYPE_POLICE);
    }

    public function currentAccident()
    {
        return $this->belongsTo(Accident::class, 'current_accident_id');
    }
}
