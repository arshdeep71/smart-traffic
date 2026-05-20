<?php
require 'vendor/autoload.php'; 
$app = require 'bootstrap/app.php'; 
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap(); 

$guard = new \Laravel\Sanctum\Guard(app('auth'), config('sanctum.expiration'), 'users');
$token = App\Models\PersonalAccessToken::first();
$method = new ReflectionMethod(\Laravel\Sanctum\Guard::class, 'isValidAccessToken');
$method->setAccessible(true);
echo "Is Valid: " . ($method->invoke($guard, $token) ? "YES" : "NO") . "\n";

