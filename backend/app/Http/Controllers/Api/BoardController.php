<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Board;
use Illuminate\Http\Request;
use Spatie\QueryBuilder\QueryBuilder;

class BoardController extends Controller
{
    /**
     * Get list of boards with filtering and sorting.
     */
    public function index(Request $request)
    {
        $boards = QueryBuilder::for(Board::class)
            ->allowedFilters(['name'])
            ->allowedSorts(['name', 'created_at', 'updated_at'])
            ->paginate($request->get('per_page', 30));

        return response()->json($boards);
    }

    /**
     * Get a single board with full snapshot.
     */
    public function show($id)
    {
        $board = Board::findOrFail($id);

        return response()->json([
            'id' => $board->id,
            'name' => $board->name,
            'data' => $board->data,
            'serverRevision' => $board->server_revision,
            'created_at' => $board->created_at,
            'updated_at' => $board->updated_at,
        ]);
    }

    /**
     * Create a new board.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'data' => 'nullable|array',
        ]);

        $board = Board::create([
            'name' => $request->name,
            'data' => $request->data ?? [],
            'server_revision' => 0,
        ]);

        return response()->json($board, 201);
    }

    /**
     * Update board with full snapshot replace.
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'data' => 'sometimes|array',
        ]);

        return DB::transaction(function () use ($request, $id) {
            $board = Board::lockForUpdate()->findOrFail($id);

            if ($request->has('data')) {
                $board->data = $request->data;
                $board->server_revision++;
            }

            if ($request->has('name')) {
                $board->name = $request->name;
            }

            $board->save();

            return response()->json([
                'serverRevision' => $board->server_revision,
                'board' => $board,
            ]);
        });
    }

    /**
     * Delete a board.
     */
    public function destroy($id)
    {
        $board = Board::findOrFail($id);
        $board->delete();

        return response()->json([
            'message' => 'Board deleted successfully',
        ]);
    }
}
