<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     * Usage in routes: ->middleware('role:admin,super_admin')
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        // Sometimes Laravel passes the comma-separated list as a single array item
        if (count($roles) === 1 && str_contains($roles[0], ',')) {
            $roles = explode(',', $roles[0]);
        }

        $userRole = trim($user->role);
        $roles = array_map('trim', $roles);

        if (! in_array($userRole, $roles)) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden. Required role: ' . implode(' or ', $roles) . '.',
            ], 403);
        }

        return $next($request);
    }
}
