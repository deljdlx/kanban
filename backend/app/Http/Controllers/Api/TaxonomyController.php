<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Taxonomy;

class TaxonomyController extends Controller
{
    /**
     * Get all taxonomies.
     */
    public function index()
    {
        $taxonomies = Taxonomy::all();

        return response()->json($taxonomies);
    }
}
