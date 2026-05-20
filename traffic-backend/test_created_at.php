<?php
require 'vendor/autoload.php'; 
$app = require 'bootstrap/app.php'; 
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap(); 
$token = App\Models\PersonalAccessToken::first(); 
echo get_class($token->created_at);
