<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Accident;

class CleanLegacyAccidents extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'accidents:clean-legacy';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up or patch old legacy accident documents in MongoDB Atlas';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🚀 Starting MongoDB legacy accident inspection and cleanup...');

        $accidents = Accident::all();
        $totalCount = $accidents->count();
        $cleaned = 0;
        $patched = 0;

        foreach ($accidents as $accident) {
            // Check legacy indicator (missing reporter_name or relative storage paths in images)
            $isLegacy = false;
            
            if (empty($accident->reporter_name)) {
                $isLegacy = true;
            }

            if ($accident->images && is_array($accident->images)) {
                foreach ($accident->images as $img) {
                    if ($img && !str_starts_with($img, 'http://') && !str_starts_with($img, 'https://') && !str_starts_with($img, 'data:')) {
                        $isLegacy = true;
                        break;
                    }
                }
            }

            if ($isLegacy) {
                // Option A: Clean and remove old seeded test incidents
                $titleLower = strtolower($accident->title ?? '');
                if (empty($accident->title) || in_array($titleLower, ['test', 'hjhj', 'asdf', 'demo', 'accident test'])) {
                    $this->warn("🗑️ Removing trash seeded legacy accident: ID={$accident->id}, Title='{$accident->title}'");
                    $accident->delete();
                    $cleaned++;
                } else {
                    // Option B: Patch with safe, readable fallbacks so they do not fall back to Citizen Priya
                    $this->line("🔧 Patching legacy accident: ID={$accident->id}, Title='{$accident->title}'");
                    $accident->reporter_name = 'Legacy Sector Incident';
                    $accident->reporter_email = 'legacy.response@traffic.local';
                    
                    // Replace relative images with a secure absolute sample if possible, or empty them
                    $cleanImages = [];
                    if ($accident->images && is_array($accident->images)) {
                        foreach ($accident->images as $img) {
                            if (str_starts_with($img, 'http://') || str_starts_with($img, 'https://')) {
                                $cleanImages[] = $img;
                            }
                        }
                    }
                    $accident->images = $cleanImages;
                    $accident->save();
                    $patched++;
                }
            }
        }

        $this->info("==================================================");
        $this->info("✅ MONGODB CLEANUP COMPLETED:");
        $this->info("  Total scanned:   $totalCount");
        $this->info("  Trash removed:   $cleaned");
        $this->info("  Safe patched:    $patched");
        $this->info("==================================================");
    }
}
