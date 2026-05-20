<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class CitizenOtp extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'citizen_otps';

    protected $fillable = [
        'email',
        'otp',
        'expires_at',
        'status', // pending, verified, expired
        'attempts',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];
}
