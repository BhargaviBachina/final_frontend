import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})

export class DashboardComponent implements OnInit {
  records: any[] = [];
  file: File | null = null;
  error: string | null = null;
  currentPage: number = 1;
  totalPages: number = 1;
  totalRecords: number = 0;
  sessionId: string | null = null;
  columns: string[] = [];
  username: string | null = null;

  fileUploadForm: FormGroup;
  searchField: string = '';
  searchValue: string = '';

  constructor(private http: HttpClient, private router: Router, private fb: FormBuilder) {
    this.fileUploadForm = this.fb.group({
      file: [null, Validators.required],
    });
  }

  // Method to fetch records with pagination and filtering
  fetchRecords(page: number = this.currentPage) {
    const token = localStorage.getItem('token');
    const sessionId = localStorage.getItem("sessionId");
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    // Ensure page is a valid number
    page = page && page > 0 ? page : 1; 

    let url = `http://localhost:5000/api/v1/records/records?page=${page}&perPage=10`;

    // Add sessionId filter if available
    if (sessionId) {
      url += `&sessionId=${sessionId}`;
    }

    // Add search parameters to the URL if they exist
    if (this.searchField && this.searchValue) {
      url += `&searchField=${this.searchField}&searchValue=${this.searchValue}`;
    }

    this.http
      .get<any>(url, {
        headers: new HttpHeaders().set('Authorization', `Bearer ${token}`),
      })
      .subscribe(
        (response) => {
          console.log('API Response:', response);
          this.records = response.data.records;
          this.currentPage = response.data.currentPage;
          this.totalPages = response.data.totalPages;
          this.totalRecords = response.data.totalRecords;

          // Dynamically update the valid fields for search
          this.columns = response.data.validFields;  // Update columns to valid fields returned by backend
        },
        (error) => {
          this.error = 'Failed to fetch records.';
        }
      );
  }

  // Method to fetch user profile data
  fetchUserProfile() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.http
      .get<any>('http://localhost:5000/api/v1/auth/profile', {
        headers: new HttpHeaders().set('Authorization', `Bearer ${token}`),
      })
      .subscribe(
        (response) => {
          this.username = response.username;
        },
        (error) => {
          this.error = 'Failed to fetch profile data.';
        }
      );
  }

  // Handle file upload
  handleFileUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    this.fileUploadForm.patchValue({ file });
  }

  // Submit the file to the backend
  uploadFile() {
    const token = localStorage.getItem('token');
    if (!token || !this.fileUploadForm.valid) return;

    const formData = new FormData();
    formData.append('file', this.fileUploadForm.get('file')?.value);

    this.http
      .post<any>('http://localhost:5000/api/v1/records/upload-csv', formData, {
        headers: new HttpHeaders().set('Authorization', `Bearer ${token}`),
      })
      .subscribe(
        (response) => {
          localStorage.setItem('sessionId', response.data.sessionId);
          this.sessionId = response.data.sessionId;
          this.fetchRecords();  // Fetch records after uploading the file
          this.error = null;
        },
        (error) => {
          this.error = 'Failed to upload file.';
        }
      );
  }

  // Handle pagination change
  changePage(page: number) {
    // Ensure page is valid and within the range
    if (page >= 1 && page <= this.totalPages) {
      this.fetchRecords(page);  // Pass the valid page to fetchRecords
    }
  }

  // Handle search query changes
  onSearchChange() {
    this.fetchRecords();  // Fetch the filtered records based on search
  }

  // On Component Initialization
  ngOnInit() {
    this.fetchRecords();  // Fetch records when the component loads
    this.fetchUserProfile();  // Fetch user profile when the component loads
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
