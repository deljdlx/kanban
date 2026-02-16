<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Spatie\QueryBuilder\QueryBuilder;

class UserController extends Controller
{
    /**
     * Get list of users with filtering and sorting via Spatie Query Builder.
     */
    public function index(Request $request)
    {
        $users = QueryBuilder::for(User::with('roles'))
            ->allowedFilters(['name', 'email'])
            ->allowedSorts(['name', 'email', 'created_at'])
            ->allowedIncludes(['roles', 'permissions'])
            ->paginate($request->get('per_page', 30));

        return response()->json($users);
    }
}
