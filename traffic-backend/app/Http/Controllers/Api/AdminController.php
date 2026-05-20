<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Accident;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    // GET /api/admin/dashboard
    public function dashboard(): JsonResponse
    {
        $stats = [
            'users' => [
                'total'     => User::count(),
                'active'    => User::where('status', 'active')->count(),
                'suspended' => User::where('status', 'suspended')->count(),
                'by_role'   => User::raw(fn ($col) => $col->aggregate([
                    ['$group' => ['_id' => '$role', 'count' => ['$sum' => 1]]],
                ]))->toArray(),
            ],
            'accidents' => [
                'total'                => Accident::count(),
                'pending'              => Accident::where('status', 'pending')->count(),
                'verified'             => Accident::where('status', 'verified')->count(),
                'emergency_dispatched' => Accident::where('status', 'emergency_dispatched')->count(),
                'resolved'             => Accident::where('status', 'resolved')->count(),
                'rejected'             => Accident::where('status', 'rejected')->count(),
                'high_severity'        => Accident::where('severity', 'high')->count(),
            ],
            'traffic' => [
                'congested_roads' => \App\Models\TrafficReport::where('congestion_level', '>=', 70)->count(),
                'blocked_roads'   => \App\Models\TrafficReport::where('status', 'blocked')->count(),
            ],
            'emergency' => [
                'total_units'     => \App\Models\EmergencyUnit::count(),
                'available_units' => \App\Models\EmergencyUnit::where('availability', true)->count(),
                'dispatched'      => \App\Models\EmergencyUnit::where('status', 'en_route')->count(),
            ],
            'generated_at' => now(),
        ];

        return response()->json([
            'success' => true,
            'data'    => $stats,
        ]);
    }

    // GET /api/admin/users
    public function users(Request $request): JsonResponse
    {
        $query = User::query();

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('email', 'like', '%' . $request->search . '%');
            });
        }

        $users = $query->orderByDesc('created_at')
            ->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data'    => $users,
        ]);
    }

    // PUT /api/admin/users/{id}
    public function updateUser(Request $request, string $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'status' => 'sometimes|in:active,suspended,pending',
            'role'   => 'sometimes|in:citizen,traffic_police,ambulance_staff,admin,super_admin',
            'name'   => 'sometimes|string|max:100',
            'phone'  => 'sometimes|string|max:20',
        ]);

        // Only super_admin can assign admin roles
        if (isset($validated['role']) && in_array($validated['role'], ['admin', 'super_admin'])) {
            if (auth()->user()->role !== 'super_admin') {
                return response()->json(['success' => false, 'message' => 'Only super_admin can assign admin roles.'], 403);
            }
        }

        $old = $user->toArray();
        $user->update($validated);

        AuditLog::record('user_updated', 'admin', $id, $old, $user->fresh()->toArray());

        return response()->json([
            'success' => true,
            'message' => 'User updated.',
            'data'    => $user->fresh(),
        ]);
    }

    // DELETE /api/admin/users/{id}
    public function deleteUser(string $id): JsonResponse
    {
        if (auth()->id() === $id) {
            return response()->json(['success' => false, 'message' => 'Cannot delete your own account.'], 422);
        }

        $user = User::findOrFail($id);
        AuditLog::record('user_deleted', 'admin', $id, $user->toArray(), []);
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted.',
        ]);
    }

    // GET /api/admin/audit-logs
    public function auditLogs(Request $request): JsonResponse
    {
        $query = AuditLog::query();

        if ($request->filled('module')) {
            $query->where('module', $request->module);
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        $logs = $query->orderByDesc('created_at')->paginate(30);

        return response()->json([
            'success' => true,
            'data'    => $logs,
        ]);
    }
}
