<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class AuditLog extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'audit_logs';

    protected $fillable = [
        'user_id',
        'action',       // e.g. "verified accident", "dispatched unit", "suspended user"
        'module',       // accident | traffic | emergency | auth | admin | user
        'resource_id',  // ObjectId of affected document
        'ip_address',
        'user_agent',
        'old_data',     // snapshot before change
        'new_data',     // snapshot after change
    ];

    protected $casts = [
        'old_data'   => 'array',
        'new_data'   => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Make logs immutable
    public static $readonly = true;

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public static function record(string $action, string $module, ?string $resourceId = null, array $old = [], array $new = []): void
    {
        $request = request();
        static::create([
            'user_id'     => auth()->id(),
            'action'      => $action,
            'module'      => $module,
            'resource_id' => $resourceId,
            'ip_address'  => $request->ip(),
            'user_agent'  => $request->userAgent(),
            'old_data'    => $old,
            'new_data'    => $new,
        ]);
    }
}
