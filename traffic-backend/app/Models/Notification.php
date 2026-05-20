<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Notification extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'notifications';

    protected $fillable = [
        'user_id',
        'title',
        'message',
        'type',      // traffic | emergency | weather | system
        'read',
        'data',      // extra payload (accident_id, location, etc.)
        'sent_via',  // array: ['in_app', 'push', 'email']
    ];

    protected $casts = [
        'read'       => 'boolean',
        'data'       => 'array',
        'sent_via'   => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Type constants
    const TYPE_TRAFFIC   = 'traffic';
    const TYPE_EMERGENCY = 'emergency';
    const TYPE_WEATHER   = 'weather';
    const TYPE_SYSTEM    = 'system';

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function scopeUnread($query)
    {
        return $query->where('read', false);
    }

    public function scopeForUser($query, string $userId)
    {
        return $query->where('user_id', $userId);
    }
}
