<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Board;
use App\Models\Image;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ImageController extends Controller
{
    /**
     * Upload an image to a board.
     */
    public function upload(Request $request, $boardId)
    {
        $request->validate([
            'image' => 'required|image|max:10240', // 10MB max
            'cardId' => 'nullable|string',
        ]);

        $board = Board::findOrFail($boardId);

        $file = $request->file('image');
        $filename = uniqid().'.'.$file->getClientOriginalExtension();
        $path = "images/{$boardId}/{$filename}";

        // Store original image
        Storage::put($path, file_get_contents($file));

        $image = Image::create([
            'board_id' => $boardId,
            'card_id' => $request->cardId,
            'path' => $path,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
        ]);

        return response()->json([
            'id' => $image->id,
            'url' => url("/api/images/{$image->id}"),
            'size' => $image->size,
            'mime_type' => $image->mime_type,
        ], 201);
    }

    /**
     * Download/show an image.
     */
    public function show($id)
    {
        $image = Image::findOrFail($id);

        if (! Storage::exists($image->path)) {
            abort(404, 'Image file not found');
        }

        return response()->file(Storage::path($image->path), [
            'Content-Type' => $image->mime_type,
            'Cache-Control' => 'public, max-age=31536000',
        ]);
    }

    /**
     * Delete an image.
     */
    public function destroy($id)
    {
        $image = Image::findOrFail($id);

        if (Storage::exists($image->path)) {
            Storage::delete($image->path);
        }

        $image->delete();

        return response()->json([
            'message' => 'Image deleted successfully',
        ]);
    }
}
