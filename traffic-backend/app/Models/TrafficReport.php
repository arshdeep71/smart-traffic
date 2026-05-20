<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class TrafficReport extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'traffic_reports';

    protected $fillable = [
        'road_id',
        'road_name',
        'vehicle_count',
        'average_speed',      // km/h
        'congestion_level',   // 0–100 percentage
        'status',             // open | congested | blocked | under_maintenance
        'weather_condition',  // clear | rain | fog | snow
        'incident_nearby',    // boolean
        'location',           // GeoJSON Point
        'reported_by',        // user_id or 'system'
    ];

    protected $casts = [
        'vehicle_count'    => 'integer',
        'average_speed'    => 'float',
        'congestion_level' => 'integer',
        'incident_nearby'  => 'boolean',
        'created_at'       => 'datetime',
        'updated_at'       => 'datetime',
    ];

    // Status constants
    const STATUS_OPEN             = 'open';
    const STATUS_CONGESTED        = 'congested';
    const STATUS_BLOCKED          = 'blocked';
    const STATUS_MAINTENANCE      = 'under_maintenance';

    public function scopeCongested($query)
    {
        return $query->where('congestion_level', '>=', 70);
    }

    public function scopeBlocked($query)
    {
        return $query->where('status', self::STATUS_BLOCKED);
    }

    public function getCongestionLabelAttribute(): string
    {
        $level = $this->congestion_level;
        if ($level < 30) return 'light';
        if ($level < 60) return 'moderate';
        if ($level < 80) return 'heavy';
        return 'severe';
    }
}
