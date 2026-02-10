<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BoardOpsTest extends TestCase
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

    public function test_admin_can_push_ops(): void
    {
        $board = Board::factory()->create([
            'data' => ['columns' => []],
            'server_revision' => 0,
        ]);

        $ops = [
            [
                'type' => 'board:name',
                'value' => 'Updated Board Name',
            ],
        ];

        $response = $this->withToken($this->token)
            ->postJson("/api/boards/{$board->id}/ops", [
                'ops' => $ops,
                'clientRevision' => 0,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'serverRevision' => 1,
            ]);

        $board->refresh();
        $this->assertEquals(1, $board->server_revision);
        $this->assertEquals('Updated Board Name', $board->data['name']);

        $this->assertDatabaseHas('ops_log', [
            'board_id' => $board->id,
            'revision' => 1,
        ]);
    }

    public function test_admin_can_pull_ops(): void
    {
        $board = Board::factory()->create([
            'data' => ['columns' => []],
            'server_revision' => 2,
        ]);

        // Push some ops first
        $this->withToken($this->token)
            ->postJson("/api/boards/{$board->id}/ops", [
                'ops' => [
                    ['type' => 'board:name', 'value' => 'Test'],
                ],
                'clientRevision' => 0,
            ]);

        // Now pull ops
        $response = $this->withToken($this->token)
            ->getJson("/api/boards/{$board->id}/ops?since=0");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'ops',
                'serverRevision',
            ]);

        $this->assertGreaterThan(0, count($response->json('ops')));
    }

    public function test_column_operations_are_applied_correctly(): void
    {
        $board = Board::factory()->create([
            'data' => ['columns' => []],
        ]);

        $ops = [
            [
                'type' => 'column:add',
                'column' => [
                    'id' => 'col-1',
                    'title' => 'To Do',
                    'cards' => [],
                ],
                'index' => 0,
            ],
        ];

        $response = $this->withToken($this->token)
            ->postJson("/api/boards/{$board->id}/ops", [
                'ops' => $ops,
                'clientRevision' => 0,
            ]);

        $response->assertStatus(200);

        $board->refresh();
        $this->assertCount(1, $board->data['columns']);
        $this->assertEquals('To Do', $board->data['columns'][0]['title']);
    }

    public function test_member_cannot_push_ops(): void
    {
        $member = User::factory()->create();
        $member->assignRole('member');
        $memberToken = $member->createToken('test-token')->plainTextToken;

        $board = Board::factory()->create();

        $response = $this->withToken($memberToken)
            ->postJson("/api/boards/{$board->id}/ops", [
                'ops' => [['type' => 'board:name', 'value' => 'Test']],
                'clientRevision' => 0,
            ]);

        $response->assertStatus(403);
    }
}
