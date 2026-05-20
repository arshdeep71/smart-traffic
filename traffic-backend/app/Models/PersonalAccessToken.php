<?php

namespace App\Models;

use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;
use MongoDB\Laravel\Eloquent\DocumentModel;

class PersonalAccessToken extends SanctumPersonalAccessToken
{
    use DocumentModel;

    protected $connection = 'mongodb';
    protected $collection = 'personal_access_tokens';
    protected $keyType = 'string';


    protected $casts = [
        'last_used_at' => 'datetime',
        'expires_at'   => 'datetime',
    ];

    /**
     * Override findToken to handle MongoDB ObjectId lookups and
     * abilities stored as JSON strings.
     */
    public static function findToken($token): ?static
    {
        if (strpos($token, '|') === false) {
            return static::where('token', hash('sha256', $token))->first();
        }

        [$id, $plainToken] = explode('|', $token, 2);

        /** @var static|null $instance */
        $instance = static::find($id);

        if (! $instance) {
            return null;
        }

        if (hash_equals($instance->token, hash('sha256', $plainToken))) {
            return $instance;
        }

        return null;
    }

    /**
     * Override can() to handle abilities stored as JSON string in MongoDB.
     */
    public function can($ability): bool
    {
        $abilities = $this->abilities;

        // If MongoDB stored it as a JSON string, decode it
        if (is_string($abilities)) {
            $abilities = json_decode($abilities, true) ?? [];
        }

        if (! is_array($abilities)) {
            $abilities = [];
        }

        return in_array('*', $abilities) ||
               in_array($ability, $abilities);
    }

    /**
     * Override cant() accordingly.
     */
    public function cant($ability): bool
    {
        return ! $this->can($ability);
    }
}
