<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Board extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'data',
        'server_revision',
    ];

    protected $casts = [
        'data' => 'array',
        'server_revision' => 'integer',
    ];

    public function opsLogs(): HasMany
    {
        return $this->hasMany(OpsLog::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(Image::class);
    }
}
