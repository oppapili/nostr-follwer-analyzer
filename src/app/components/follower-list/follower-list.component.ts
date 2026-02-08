import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Follower } from '../../models/follower.model';

@Component({
  selector: 'app-follower-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './follower-list.component.html',
  styleUrl: './follower-list.component.css'
})
export class FollowerListComponent {
  @Input() followers: Follower[] = [];
  @Input() loading: boolean = false;
  @Output() followUser = new EventEmitter<string>();

  get sortedFollowers(): Follower[] {
    return this.followers;
  }

  onFollowUser(pubkey: string): void {
    this.followUser.emit(pubkey);
  }
}
