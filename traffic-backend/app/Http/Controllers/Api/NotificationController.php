<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    // GET /api/notifications
    public function index(Request $request): JsonResponse
    {
        $notifications = Notification::forUser(auth()->id())
            ->orderByDesc('created_at')
            ->paginate($request->get('per_page', 20));

        $unreadCount = Notification::forUser(auth()->id())->unread()->count();

        return response()->json([
            'success'      => true,
            'unread_count' => $unreadCount,
            'data'         => $notifications,
        ]);
    }

    // POST /api/notifications/send  (Admin/System)
    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'    => 'required|string|max:200',
            'message'  => 'required|string|max:1000',
            'type'     => 'required|in:traffic,emergency,weather,system',
            'user_ids' => 'nullable|array',  // null = broadcast to all
            'user_ids.*' => 'string',
            'data'     => 'nullable|array',
        ]);

        $notifications = [];

        if (empty($validated['user_ids'])) {
            // Broadcast to all active users
            $users = User::where('status', 'active')->pluck('_id');
        } else {
            $users = $validated['user_ids'];
        }

        foreach ($users as $userId) {
            $notifications[] = [
                'user_id'    => (string) $userId,
                'title'      => $validated['title'],
                'message'    => $validated['message'],
                'type'       => $validated['type'],
                'read'       => false,
                'data'       => $validated['data'] ?? [],
                'sent_via'   => ['in_app'],
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        Notification::insert($notifications);

        return response()->json([
            'success'    => true,
            'message'    => 'Notification sent to ' . count($users) . ' users.',
            'recipients' => count($users),
        ], 201);
    }

    // PUT /api/notifications/read/{id}
    public function markRead(string $id): JsonResponse
    {
        $notification = Notification::where('_id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        $notification->update(['read' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read.',
        ]);
    }

    // PUT /api/notifications/read-all
    public function markAllRead(): JsonResponse
    {
        Notification::forUser(auth()->id())
            ->unread()
            ->update(['read' => true]);

        return response()->json([
            'success' => true,
            'message' => 'All notifications marked as read.',
        ]);
    }

    // DELETE /api/notifications/{id}
    public function destroy(string $id): JsonResponse
    {
        Notification::where('_id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail()
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notification deleted.',
        ]);
    }
}
