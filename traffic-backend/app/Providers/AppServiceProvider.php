<?php

namespace App\Providers;

use App\Models\PersonalAccessToken;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Tell Sanctum to use our MongoDB-backed PersonalAccessToken model
        Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);

        // Confirm MongoDB connection and log startup status
        try {
            $connection = \DB::connection('mongodb');
            $dbName = $connection->getDatabaseName();
            
            // Get active connection client and list databases to confirm connection
            $mongoClient = $connection->getMongoClient();
            $mongoClient->listDatabases();
            
            // Parse DSN/URI for logging host information securely
            $dsn = config('database.connections.mongodb.dsn') ?? config('database.connections.mongodb.uri') ?? '';
            $isSrv = str_starts_with(strtolower($dsn), 'mongodb+srv');
            
            // Redact password from logged DSN/Host info
            $loggedHost = 'Unknown';
            if (preg_match('/@([^:\/\?]+)/', $dsn, $matches)) {
                $loggedHost = $matches[1];
            } elseif (preg_match('/mongodb:\/\/(.*?)(?:\/|$)/', $dsn, $matches)) {
                $loggedHost = $matches[1];
            }

            // Parse final database segment from DSN
            $parsedDbSegment = 'None';
            if (preg_match('/\/([^?\/]+)(?:\?|$)/', $dsn, $matches)) {
                $parsedDbSegment = $matches[1];
            }

            // Get active collections in the database
            $collections = [];
            foreach ($connection->getMongoDB()->listCollections() as $collectionInfo) {
                $collections[] = $collectionInfo->getName();
            }

            \Log::info("[DATABASE BOOT] MongoDB connected successfully!");
            \Log::info("[DATABASE BOOT] Active Host: '{$loggedHost}'");
            \Log::info("[DATABASE BOOT] Active Database Name: '{$dbName}'");
            \Log::info("[DATABASE BOOT] Parsed DSN Database Segment: '{$parsedDbSegment}'");
            \Log::info("[DATABASE BOOT] Atlas Cloud SRV Active: " . ($isSrv ? 'YES (mongodb+srv)' : 'NO (standard connection)'));
            \Log::info("[DATABASE BOOT] Active MongoDB Collections loaded: [" . implode(', ', $collections) . "]");
            \Log::info("[DATABASE BOOT] Strict Mode: NO fallback databases (SQL/SQLite/MySQL) are active.");
        } catch (\Exception $e) {
            \Log::error("[DATABASE BOOT] Failed to establish MongoDB connection: " . $e->getMessage());
        }
    }
}
