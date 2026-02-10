<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Taxonomy extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'label',
        'terms',
    ];

    protected $casts = [
        'terms' => 'array',
    ];
}
