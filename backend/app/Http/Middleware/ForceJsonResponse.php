<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Force Accept: application/json sur toutes les requetes API.
 *
 * Sans ce header, Laravel retourne des redirections HTML (ex: route('login'))
 * au lieu de reponses JSON 401 quand le token est absent ou expire.
 */
class ForceJsonResponse
{
    public function handle(Request $request, Closure $next): Response
    {
        $request->headers->set('Accept', 'application/json');

        return $next($request);
    }
}
