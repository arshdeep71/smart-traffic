<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FileController extends Controller
{
    // POST /api/upload/image
    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'file'    => 'required|file|mimes:jpg,jpeg,png,pdf|max:10240',
            'context' => 'nullable|in:accident,evidence,report,profile',
        ]);

        $file    = $request->file('file');
        $context = $request->get('context', 'general');

        // Generate unique filename
        $filename  = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $directory = "uploads/{$context}";
        $path      = $file->storeAs($directory, $filename, 'public');

        AuditLog::record('file_uploaded', 'file', null, [], [
            'path'    => $path,
            'context' => $context,
            'size'    => $file->getSize(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'File uploaded successfully.',
            'data'    => [
                'path'      => $path,
                'url'       => Storage::disk('public')->url($path),
                'filename'  => $filename,
                'size'      => $file->getSize(),
                'mime_type' => $file->getMimeType(),
            ],
        ], 201);
    }

    // DELETE /api/upload/{filename}
    public function delete(Request $request, string $filename): JsonResponse
    {
        // Only allow deleting from uploads directory
        $path = "uploads/{$filename}";

        if (! Storage::disk('public')->exists($path)) {
            // Try subdirectories
            $found = false;
            foreach (['accident', 'evidence', 'report', 'profile', 'general'] as $ctx) {
                $fullPath = "uploads/{$ctx}/{$filename}";
                if (Storage::disk('public')->exists($fullPath)) {
                    $path  = $fullPath;
                    $found = true;
                    break;
                }
            }

            if (! $found) {
                return response()->json([
                    'success' => false,
                    'message' => 'File not found.',
                ], 404);
            }
        }

        Storage::disk('public')->delete($path);

        AuditLog::record('file_deleted', 'file', null, ['path' => $path], []);

        return response()->json([
            'success' => true,
            'message' => 'File deleted.',
        ]);
    }
}
