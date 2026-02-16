<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Board;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
     * Get lightweight board registry (metadata without heavy data field).
     *
     * Returns an array of board metadata compatible with the frontend BoardMeta format:
     * { id, name, description, columnCount, cardCount, coverImageId, createdAt, updatedAt }
     */
    public function registry()
    {
        // Charge uniquement les colonnes necessaires.
        // Le champ data (JSON) est requis pour calculer les stats (columnCount, cardCount).
        // cursor() evite de charger tous les boards en memoire simultanement.
        $boards = Board::select(['id', 'name', 'data', 'created_at', 'updated_at'])->get();

        $registry = $boards->map(function (Board $board) {
            $data = $board->data ?? [];
            $columns = $data['columns'] ?? [];

            $cardCount = 0;
            foreach ($columns as $column) {
                $cardCount += count($column['cards'] ?? []);
            }

            return [
                'id' => $board->id,
                'name' => $board->name,
                'description' => $data['description'] ?? '',
                'columnCount' => count($columns),
                'cardCount' => $cardCount,
                'coverImageId' => $data['coverImageId'] ?? null,
                'createdAt' => $board->created_at?->toISOString(),
                'updatedAt' => $board->updated_at?->toISOString(),
            ];
        });

        return response()->json($registry->values());
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
