<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Simulate what Sanctum does
$bearerToken = "69f4437b0c9099b0b107c702|" . "testtoken"; // format: id|token

// Get the latest token from DB
$dbToken = App\Models\PersonalAccessToken::latest()->first();
echo "DB Token ID: " . $dbToken->id . "\n";
echo "DB Token type: " . get_class($dbToken) . "\n";

// Simulate hasApiTokens createToken then findToken
$user = App\Models\User::where('email', 'admin@traffic.local')->first();
echo "\nUser: " . $user->name . "\n";

// Create a fresh token
$newToken = $user->createToken('test');
echo "Created token (plain): " . $newToken->plainTextToken . "\n";
echo "Token ID part: " . explode('|', $newToken->plainTextToken)[0] . "\n";

// Now try to find it
$found = App\Models\PersonalAccessToken::findToken($newToken->plainTextToken);
echo "findToken result: " . ($found ? "FOUND - " . $found->id : "NOT FOUND") . "\n";

// Test that tokenable works
if ($found) {
    $tokenable = $found->tokenable;
    echo "Tokenable: " . ($tokenable ? $tokenable->name : "NULL") . "\n";
}
