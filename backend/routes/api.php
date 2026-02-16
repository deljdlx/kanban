<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BoardController;
use App\Http\Controllers\Api\BoardOpsController;
use App\Http\Controllers\Api\ImageController;
use App\Http\Controllers\Api\TaxonomyController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::get('/version', fn () => response()->json([
    'api' => config('kanban.api_version', '1.0.0'),
    'app' => config('app.name'),
]));

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Users
    Route::get('/users', [UserController::class, 'index'])
        ->middleware('can:user.manage');

    // Taxonomies
    Route::get('/taxonomies', [TaxonomyController::class, 'index']);

    // Boards CRUD
    Route::get('/boards/registry', [BoardController::class, 'registry'])
        ->middleware('can:board.view');
    Route::get('/boards', [BoardController::class, 'index'])
        ->middleware('can:board.view');
    Route::get('/boards/{id}', [BoardController::class, 'show'])
        ->middleware('can:board.view');
    Route::post('/boards', [BoardController::class, 'store'])
        ->middleware('can:board.create');
    Route::put('/boards/{id}', [BoardController::class, 'update'])
        ->middleware('can:board.edit');
    Route::delete('/boards/{id}', [BoardController::class, 'destroy'])
        ->middleware('can:board.delete');

    // Board operations (sync)
    Route::post('/boards/{id}/ops', [BoardOpsController::class, 'pushOps'])
        ->middleware('can:board.edit');
    Route::get('/boards/{id}/ops', [BoardOpsController::class, 'pullOps'])
        ->middleware('can:board.view');

    // Images
    Route::post('/boards/{boardId}/images', [ImageController::class, 'upload'])
        ->middleware('can:image.upload');
    Route::get('/images/{id}', [ImageController::class, 'show']);
    Route::delete('/images/{id}', [ImageController::class, 'destroy'])
        ->middleware('can:image.delete');
});
