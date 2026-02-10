<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BoardTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected string $token;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed roles and permissions
        $this->artisan('db:seed', ['--class' => 'RolesAndPermissionsSeeder']);

        // Create admin user
        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
        $this->token = $this->admin->createToken('test-token')->plainTextToken;
    }

    public function test_admin_can_create_board(): void
    {
        $response = $this->withToken($this->token)
            ->postJson('/api/boards', [
                'name' => 'Test Board',
                'data' => [
                    'columns' => [],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'id',
                'name',
                'data',
                'server_revision',
            ])
            ->assertJson([
                'name' => 'Test Board',
                'server_revision' => 0,
            ]);

        $this->assertDatabaseHas('boards', [
            'name' => 'Test Board',
        ]);
    }

    public function test_admin_can_list_boards(): void
    {
        Board::factory()->count(3)->create();

        $response = $this->withToken($this->token)
            ->getJson('/api/boards');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'server_revision'],
                ],
            ]);
    }

    public function test_admin_can_get_single_board(): void
    {
        $board = Board::factory()->create([
            'name' => 'Test Board',
            'data' => ['columns' => []],
        ]);

        $response = $this->withToken($this->token)
            ->getJson("/api/boards/{$board->id}");

        $response->assertStatus(200)
            ->assertJson([
                'id' => $board->id,
                'name' => 'Test Board',
            ]);
    }

    public function test_admin_can_update_board(): void
    {
        $board = Board::factory()->create([
            'name' => 'Old Name',
        ]);

        $response = $this->withToken($this->token)
            ->putJson("/api/boards/{$board->id}", [
                'name' => 'New Name',
                'data' => ['columns' => []],
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'serverRevision' => 1,
            ]);

        $this->assertDatabaseHas('boards', [
            'id' => $board->id,
            'name' => 'New Name',
            'server_revision' => 1,
        ]);
    }

    public function test_admin_can_delete_board(): void
    {
        $board = Board::factory()->create();

        $response = $this->withToken($this->token)
            ->deleteJson("/api/boards/{$board->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('boards', [
            'id' => $board->id,
        ]);
    }

    public function test_member_cannot_create_board(): void
    {
        $member = User::factory()->create();
        $member->assignRole('member');
        $memberToken = $member->createToken('test-token')->plainTextToken;

        $response = $this->withToken($memberToken)
            ->postJson('/api/boards', [
                'name' => 'Test Board',
            ]);

        $response->assertStatus(403);
    }

    public function test_viewer_can_view_but_not_edit_board(): void
    {
        $viewer = User::factory()->create();
        $viewer->assignRole('viewer');
        $viewerToken = $viewer->createToken('test-token')->plainTextToken;

        $board = Board::factory()->create();

        // Can view
        $response = $this->withToken($viewerToken)
            ->getJson("/api/boards/{$board->id}");
        $response->assertStatus(200);

        // Cannot edit
        $response = $this->withToken($viewerToken)
            ->putJson("/api/boards/{$board->id}", [
                'name' => 'New Name',
            ]);
        $response->assertStatus(403);
    }
}
