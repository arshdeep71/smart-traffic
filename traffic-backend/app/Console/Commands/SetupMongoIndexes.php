<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use MongoDB\Laravel\Connection;
use Illuminate\Support\Facades\DB;

class SetupMongoIndexes extends Command
{
    protected $signature   = 'mongo:setup-indexes';
    protected $description = 'Create all required MongoDB 2dsphere geospatial indexes for Smart Traffic System';

    public function handle(): int
    {
        $this->info('🔧 Setting up MongoDB indexes...');

        try {
            /** @var Connection $db */
            $db = DB::connection('mongodb');

            // ── Accidents ──────────────────────────────────────────────
            $accidents = $db->getCollection('accidents');
            $accidents->createIndex(['location' => '2dsphere']);
            $accidents->createIndex(['status' => 1]);
            $accidents->createIndex(['severity' => 1]);
            $accidents->createIndex(['user_id' => 1]);
            $accidents->createIndex(['created_at' => -1]);
            $this->line('  ✅ accidents: 2dsphere + status + severity + user_id + created_at');

            // ── Emergency Units ────────────────────────────────────────
            $units = $db->getCollection('emergency_units');
            $units->createIndex(['location' => '2dsphere']);
            $units->createIndex(['type' => 1, 'availability' => 1]);
            $units->createIndex(['status' => 1]);
            $this->line('  ✅ emergency_units: 2dsphere + type/availability + status');

            // ── Traffic Reports ────────────────────────────────────────
            $traffic = $db->getCollection('traffic_reports');
            $traffic->createIndex(['location' => '2dsphere']);
            $traffic->createIndex(['road_name' => 1], ['unique' => true]);
            $traffic->createIndex(['congestion_level' => -1]);
            $traffic->createIndex(['status' => 1]);
            $traffic->createIndex(['updated_at' => -1]);
            $this->line('  ✅ traffic_reports: 2dsphere + road_name(unique) + congestion + status');

            // ── Users ──────────────────────────────────────────────────
            $users = $db->getCollection('users');
            $users->createIndex(['email' => 1], ['unique' => true]);
            $users->createIndex(['role' => 1]);
            $users->createIndex(['status' => 1]);
            $this->line('  ✅ users: email(unique) + role + status');

            // ── Notifications ──────────────────────────────────────────
            $notifications = $db->getCollection('notifications');
            $notifications->createIndex(['user_id' => 1, 'read' => 1]);
            $notifications->createIndex(['created_at' => -1]);
            $this->line('  ✅ notifications: user_id/read + created_at');

            // ── Audit Logs ─────────────────────────────────────────────
            $logs = $db->getCollection('audit_logs');
            $logs->createIndex(['user_id' => 1]);
            $logs->createIndex(['module' => 1]);
            $logs->createIndex(['created_at' => -1]);
            // TTL index: auto-delete logs older than 90 days
            $logs->createIndex(['created_at' => 1], ['expireAfterSeconds' => 7776000]);
            $this->line('  ✅ audit_logs: user_id + module + created_at + TTL(90d)');

        } catch (\Exception $e) {
            $this->error('❌ Failed: ' . $e->getMessage());
            return self::FAILURE;
        }

        $this->newLine();
        $this->info('✅ All MongoDB indexes created successfully!');
        return self::SUCCESS;
    }
}
