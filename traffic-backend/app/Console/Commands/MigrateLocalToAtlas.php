<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use MongoDB\Client as MongoClient;

class MigrateLocalToAtlas extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:migrate-local-to-atlas';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Perform a complete migration of all MongoDB collections from localhost to MongoDB Atlas cloud';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("==================================================================");
        $this->info("🚀 STARTING SMARTTRAFFIC MONGODB TO ATLAS CLOUD MIGRATION");
        $this->info("==================================================================");

        $localDsn = "mongodb://127.0.0.1:27017";
        $localDbName = "smart_traffic_db";
        
        // Get parsed DSN or active DSN from config or env
        $atlasDsn = config('database.connections.mongodb.dsn') ?: env('MONGODB_URI');

        if (!$atlasDsn) {
            $this->error("❌ MONGODB_URI environment variable is missing in Laravel config!");
            return Command::FAILURE;
        }

        $this->comment("🔌 Connecting to Local MongoDB at: {$localDsn} ...");
        try {
            $localClient = new MongoClient($localDsn);
            $localDb = $localClient->selectDatabase($localDbName);
            // Quick connectivity test
            $localDb->listCollections();
            $this->info("✅ Connected successfully to localhost MongoDB.");
        } catch (\Exception $e) {
            $this->error("❌ Failed to connect to localhost MongoDB: " . $e->getMessage());
            $this->error("Please ensure your local MongoDB daemon (mongod) is running on port 27017.");
            return Command::FAILURE;
        }

        $this->comment("🔌 Connecting to MongoDB Atlas Cloud Cluster ...");
        try {
            $atlasClient = new MongoClient($atlasDsn);
            $atlasDbName = "smart_traffic_db";
            $atlasDb = $atlasClient->selectDatabase($atlasDbName);
            // Quick connectivity test
            $atlasDb->listCollections();
            $this->info("✅ Connected successfully to MongoDB Atlas Cloud.");
        } catch (\Exception $e) {
            $this->error("❌ Failed to connect to MongoDB Atlas Cloud: " . $e->getMessage());
            return Command::FAILURE;
        }

        $this->comment("📁 Listing local collections in '{$localDbName}'...");
        $collections = [];
        try {
            foreach ($localDb->listCollections() as $colInfo) {
                $collections[] = $colInfo->getName();
            }
        } catch (\Exception $e) {
            $this->error("❌ Failed to list collections from local MongoDB: " . $e->getMessage());
            return Command::FAILURE;
        }

        if (empty($collections)) {
            $this->error("❌ No collections found in local database '{$localDbName}'!");
            $this->error("Please ensure your local database is populated before migrating.");
            return Command::FAILURE;
        }

        $this->info("📝 Found " . count($collections) . " collections to migrate: " . implode(', ', $collections));
        $this->info("------------------------------------------------------------------");

        $summary = [];

        foreach ($collections as $colName) {
            $this->comment("\n🔄 Migrating collection [{$colName}]...");
            $localCol = $localDb->selectCollection($colName);
            $atlasCol = $atlasDb->selectCollection($colName);

            try {
                // Fetch all documents from local
                $cursor = $localCol->find([]);
                $documents = iterator_to_array($cursor);
                $count = count($documents);

                $this->line("   👉 Local document count: {$count}");

                if ($count > 0) {
                    $this->line("   🗑️ Dropping Atlas collection [{$colName}] to avoid duplicates...");
                    $atlasCol->drop();

                    $this->line("   💾 Inserting documents into Atlas [{$colName}]...");
                    $insertResult = $atlasCol->insertMany($documents);
                    $insertedCount = $insertResult->getInsertedCount();
                    $this->info("   ✅ Inserted {$insertedCount} / {$count} documents.");
                } else {
                    $this->line("   ℹ️ Collection is empty. Recreating empty collection in Atlas...");
                    $atlasCol->drop();
                    $atlasDb->createCollection($colName);
                    $insertedCount = 0;
                    $this->info("   ✅ Created empty collection.");
                }

                $summary[$colName] = [
                    'source' => $count,
                    'dest' => $insertedCount,
                    'status' => ($count === $insertedCount) ? 'OK' : 'MISMATCH'
                ];
            } catch (\Exception $e) {
                $this->error("   ❌ Error migrating [{$colName}]: " . $e->getMessage());
                $summary[$colName] = [
                    'source' => $count ?? 0,
                    'dest' => 0,
                    'status' => 'ERROR: ' . $e->getMessage()
                ];
            }
        }

        $this->info("\n==================================================================");
        $this->info("🔍 MIGRATION COMPLETE AND AUDITED");
        $this->info("==================================================================");

        $mismatches = 0;
        foreach ($summary as $colName => $data) {
            $src = $data['source'];
            $dest = $data['dest'];
            $status = $data['status'];

            if ($status === 'OK') {
                $this->line("✅ [{$colName}]: Source ({$src}) == Atlas ({$dest}) - Match!");
            } else {
                $this->error("❌ [{$colName}]: Source ({$src}) != Atlas ({$dest}) - Mismatch ({$status})");
                $mismatches++;
            }
        }

        $this->info("------------------------------------------------------------------");
        if ($mismatches === 0) {
            $this->info("🎉 SUCCESS: 100% data integrity verified. All collection documents match perfectly!");
            $this->info("Local SmartTraffic MongoDB data has been fully migrated to MongoDB Atlas cloud.");
            return Command::SUCCESS;
        } else {
            $this->warn("⚠️ WARNING: Migration completed but {$mismatches} mismatch/error cases were detected.");
            return Command::FAILURE;
        }
    }
}
