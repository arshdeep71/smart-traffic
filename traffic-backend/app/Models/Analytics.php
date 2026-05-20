<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Analytics extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'analytics';

    protected $fillable = [
        'area',
        'accident_count',
        'congestion_average',
        'peak_hour',
        'dangerous_zones',  // array of coordinates
        'traffic_density',  // array [{hour, density}]
        'report_type',      // daily | weekly | monthly
        'generated_at',
    ];

    protected $casts = [
        'accident_count'    => 'integer',
        'congestion_average'=> 'float',
        'dangerous_zones'   => 'array',
        'traffic_density'   => 'array',
        'generated_at'      => 'datetime',
        'created_at'        => 'datetime',
        'updated_at'        => 'datetime',
    ];
}
