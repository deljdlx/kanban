<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Board;
use App\Models\OpsLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BoardOpsController extends Controller
{
    /**
     * Push operations to board.
     */
    public function pushOps(Request $request, $id)
    {
        $request->validate([
            'ops' => 'required|array',
            'clientRevision' => 'required|integer',
        ]);

        $board = Board::findOrFail($id);

        DB::transaction(function () use ($request, $board) {
            // Increment server revision
            $board->server_revision++;

            // Store ops in log
            OpsLog::create([
                'board_id' => $board->id,
                'revision' => $board->server_revision,
                'ops' => $request->ops,
                'user_id' => auth()->id(),
                'created_at' => now(),
            ]);

            // Apply ops to board data
            $data = $board->data ?? [];
            foreach ($request->ops as $op) {
                $data = $this->applyOperation($data, $op);
            }

            $board->data = $data;
            $board->save();
        });

        return response()->json([
            'serverRevision' => $board->server_revision,
        ]);
    }

    /**
     * Pull operations from board since a specific revision.
     */
    public function pullOps(Request $request, $id)
    {
        $sinceRevision = $request->get('since', 0);

        $board = Board::findOrFail($id);

        $opsLogs = OpsLog::where('board_id', $id)
            ->where('revision', '>', $sinceRevision)
            ->orderBy('revision')
            ->get();

        $ops = [];
        foreach ($opsLogs as $log) {
            $ops = array_merge($ops, $log->ops);
        }

        return response()->json([
            'ops' => $ops,
            'serverRevision' => $board->server_revision,
        ]);
    }

    /**
     * Apply a single operation to board data.
     */
    private function applyOperation(array $data, array $op): array
    {
        $type = $op['type'] ?? '';

        switch ($type) {
            case 'board:name':
                $data['name'] = $op['value'];
                break;

            case 'board:backgroundImage':
                $data['backgroundImage'] = $op['value'];
                break;

            case 'board:pluginData':
                if (! isset($data['pluginData'])) {
                    $data['pluginData'] = [];
                }
                if ($op['value'] === null) {
                    unset($data['pluginData'][$op['key']]);
                } else {
                    $data['pluginData'][$op['key']] = $op['value'];
                }
                break;

            case 'column:add':
                if (! isset($data['columns'])) {
                    $data['columns'] = [];
                }
                array_splice($data['columns'], $op['index'], 0, [$op['column']]);
                break;

            case 'column:remove':
                if (isset($data['columns'])) {
                    $data['columns'] = array_values(array_filter($data['columns'], function ($col) use ($op) {
                        return $col['id'] !== $op['columnId'];
                    }));
                }
                break;

            case 'column:reorder':
                if (isset($data['columns'])) {
                    $indexed = [];
                    foreach ($data['columns'] as $col) {
                        $indexed[$col['id']] = $col;
                    }
                    $data['columns'] = array_values(array_map(fn ($id) => $indexed[$id], $op['columnIds']));
                }
                break;

            case 'column:title':
                if (isset($data['columns'])) {
                    foreach ($data['columns'] as &$col) {
                        if ($col['id'] === $op['columnId']) {
                            $col['title'] = $op['value'];
                            break;
                        }
                    }
                }
                break;

            case 'column:pluginData':
                if (isset($data['columns'])) {
                    foreach ($data['columns'] as &$col) {
                        if ($col['id'] === $op['columnId']) {
                            if (! isset($col['pluginData'])) {
                                $col['pluginData'] = [];
                            }
                            if ($op['value'] === null) {
                                unset($col['pluginData'][$op['key']]);
                            } else {
                                $col['pluginData'][$op['key']] = $op['value'];
                            }
                            break;
                        }
                    }
                }
                break;

            case 'column:cards':
                if (isset($data['columns'])) {
                    foreach ($data['columns'] as &$col) {
                        if ($col['id'] === $op['columnId']) {
                            $col['cards'] = $op['cards'];
                            break;
                        }
                    }
                }
                break;
        }

        return $data;
    }
}
