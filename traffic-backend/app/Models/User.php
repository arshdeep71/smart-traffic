<?php

namespace App\Models;

use Illuminate\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Access\Authorizable as AuthorizableContract;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Foundation\Auth\Access\Authorizable;
use Laravel\Sanctum\HasApiTokens;
use MongoDB\Laravel\Eloquent\Model;

class User extends Model implements AuthenticatableContract, AuthorizableContract
{
    use Authenticatable, Authorizable, HasApiTokens;

    protected $connection = 'mongodb';
    protected $collection = 'users';

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'role',        // citizen | traffic_police | ambulance_staff | admin | super_admin | hospital_admin | hospital_driver | hospital_staff
        'status',      // active | suspended | pending
        'email_verified_at',
        'device_token', // for push notifications
        'reset_token',
        'reset_token_expires_at',
        'hospital_id', // for hospital_admin, hospital_driver, hospital_staff
        'profile_completed', // stored in MongoDB
        'emergency_contact', // stored in MongoDB
        'onboarding_completed', // stored in MongoDB
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'reset_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'reset_token_expires_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, ['admin', 'super_admin']);
    }

    public function isPolice(): bool
    {
        return $this->role === 'traffic_police';
    }

    public function isAmbulance(): bool
    {
        return $this->role === 'ambulance_staff';
    }

    public function isHospitalAdmin(): bool
    {
        return $this->role === 'hospital_admin';
    }

    public function isHospitalStaff(): bool
    {
        return in_array($this->role, ['hospital_admin', 'hospital_driver', 'hospital_staff']);
    }

    /**
     * Override Sanctum's token model to use MongoDB version.
     */
    public function tokenModel(): string
    {
        return PersonalAccessToken::class;
    }
}
