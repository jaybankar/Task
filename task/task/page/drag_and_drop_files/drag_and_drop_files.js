frappe.pages['drag-and-drop-files'].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Drag and Drop Files',
		single_column: true
	});

	let pending_files = [];

	const field_row = $(`
		<div class="row" style="margin-bottom: 15px;">
			<div class="col-md-4 doctype-field"></div>
			<div class="col-md-4 record-field"></div>
			<div class="col-md-4 upload-btn"></div>
		</div>
	`).appendTo(page.body);

	const doctype_field = frappe.ui.form.make_control({
		parent: field_row.find('.doctype-field'),
		df: {
			label: 'Select Doctype',
			fieldtype: 'Link',
			fieldname: 'doctype',
			options: 'DocType',
			reqd: 1,
			get_query() {
				return {
					filters: {
						issingle: 0,
						istable: 0
					}
				};
			}
		},
		render_input: true
	});

	const record_field = frappe.ui.form.make_control({
		parent: field_row.find('.record-field'),
		df: {
			label: 'Select Record',
			fieldtype: 'Dynamic Link',
			fieldname: 'record',
			options: 'doctype',
			reqd: 1
		},
		render_input: true
	});

	const upload_btn = $(`
		<button class="btn btn-primary" style="margin-top: 24px;" disabled>
			Upload Documents
		</button>
	`).appendTo(field_row.find('.upload-btn'));

	const drop_area = $(`
		<div class="drag-drop-area text-center"
			style="
				border: 2px dashed #ccc;
				padding: 40px;
				cursor: pointer;
				margin-bottom: 20px;
			">
			<b>Drag & Drop files here</b><br>
			<small>or click to browse</small>
		</div>
	`).appendTo(page.body);

	const file_input = $('<input type="file" multiple hidden>').appendTo(page.body);

	const attachment_table = $(`
		<table class="table table-bordered attachment-table">
			<thead>
				<tr>
					<th>Attachment</th>
					<th>File/Image</th>
					<th style="width: 60px;">Action</th>
				</tr>
			</thead>
			<tbody></tbody>
		</table>
	`).appendTo(page.body);

	drop_area.on('click', () => file_input.click());

	drop_area.on('dragover', e => {
		e.preventDefault();
		drop_area.addClass('bg-light');
	});

	drop_area.on('dragleave', () => {
		drop_area.removeClass('bg-light');
	});

	drop_area.on('drop', e => {
		e.preventDefault();
		drop_area.removeClass('bg-light');
		handle_files(e.originalEvent.dataTransfer.files);
	});

	file_input.on('change', e => {
		handle_files(e.target.files);
	});

	function handle_files(files) {
		[...files].forEach(file => {
			pending_files.push(file);
			add_row(file);
		});
		toggle_upload_btn();
	}

	function add_row(file) {
		const reader = new FileReader();

		reader.onload = function (e) {
			const img = file.type.startsWith('image')
				? `<img src="${e.target.result}" style="max-height: 60px;">`
				: '-';

			const row = $(`
				<tr>
					<td>${file.name}</td>
					<td>${img}</td>
					<td>
						<button class="btn btn-xs btn-danger">X</button>
					</td>
				</tr>
			`);

			row.find('button').on('click', () => {
				pending_files = pending_files.filter(f => f !== file);
				row.remove();
				toggle_upload_btn();
			});

			attachment_table.find('tbody').append(row);
		};

		reader.readAsDataURL(file);
	}

	function toggle_upload_btn() {
		upload_btn.prop('disabled', !pending_files.length);
	}

	upload_btn.on('click', async () => {

		const doctype = doctype_field.get_value();
		const docname = record_field.get_value();

		if (!doctype || !docname) {
			frappe.msgprint(__('Please select Doctype and Record'));
			return;
		}

		for (const file of pending_files) {
			await upload_file_to_doc(file, doctype, docname);
		}

		frappe.show_alert({
			message: __('Files successfully attached to ') + docname,
			indicator: 'green'
		}, 10)

		pending_files = [];
		attachment_table.find('tbody').empty();
		toggle_upload_btn();
	});

};

function upload_file_to_doc(file, doctype, docname) {
	return new Promise((resolve, reject) => {

		const formData = new FormData();
		formData.append("file", file);
		formData.append("doctype", doctype);
		formData.append("docname", docname);
		formData.append("is_private", 0);

		$.ajax({
			url: "/api/method/upload_file",
			type: "POST",
			data: formData,
			processData: false,  
			contentType: false,  
			headers: {
				"X-Frappe-CSRF-Token": frappe.csrf_token
			},
			success: function () {
				resolve();
			},
			error: function (err) {
				frappe.msgprint(__('Failed to upload ') + file.name);
				reject(err);
			}
		});
	});
}

