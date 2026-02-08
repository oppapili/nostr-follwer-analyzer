import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Nip07Service } from '../../services/nip07.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  @Output() loginSuccess = new EventEmitter<string>();
  
  nip07Available = false;
  loading = false;
  errorMessage = '';

  constructor(private nip07Service: Nip07Service) {}

  ngOnInit(): void {
    // NIP-07 拡張機能の有無を確認
    // Requirements: 1.1, 1.2
    this.nip07Available = this.nip07Service.isAvailable();
  }

  /**
   * ログインボタンがクリックされた時の処理
   * Requirements: 1.4, 1.5, 1.7
   */
  onLogin(): void {
    this.loading = true;
    this.errorMessage = '';

    this.nip07Service.login().subscribe({
      next: (pubkey) => {
        // ログイン成功
        this.loading = false;
        this.loginSuccess.emit(pubkey);
      },
      error: (error) => {
        // エラーハンドリング
        // Requirements: 1.7
        this.loading = false;
        this.errorMessage = error.message || 'ログインに失敗しました';
        console.error('Login error:', error);
      }
    });
  }
}
