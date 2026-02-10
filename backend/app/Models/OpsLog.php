<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OpsLog extends Model
{
    use HasFactory;

    protected $table = 'ops_log';
    
    public $timestamps = false;

    protected $fillable = [
        'board_id',
        'revision',
        'ops',
        'user_id',
        'created_at',
    ];

    protected $casts = [
        'ops' => 'array',
        'revision' => 'integer',
        'created_at' => 'datetime',
    ];

    public function board(): BelongsTo
    {
        return $this->belongsTo(Board::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
