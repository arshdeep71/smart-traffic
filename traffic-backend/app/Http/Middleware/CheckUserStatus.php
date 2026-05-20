<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckUserStatus
{
    /**
     * Reject suspended users even if they have a valid token.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->status === 'suspended') {
            // Revoke all tokens
            $user->tokens()->delete();

            return response()->json([
                'success' => false,
                'message' => 'Your account has been suspended. Contact support.',
            ], 403);
        }

        return $next($request);
    }
}
