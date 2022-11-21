// make todolist interactive
function SortAndEdit(){

	// when want to edit text
	$('.edit').click(function(){
        $(this).hide();
        $(this).next().show();
        $(this).next().select();
    });

	// when text out of focus
	$('input[type=text].todo-item').blur(function() {
		 if ($.trim(this.value) == ''){
			 $(this).parent().parent().parent().remove() // remove if empty
		 }
		 else{
			 $(this).prev().html(this.value);
		 }
		 $(this).hide();
		 $(this).prev().show();
	});

	// when enter pressed
	$('input[type=text].todo-item').keypress(function(event) {
        if (event.keyCode == '13') {
            if ($.trim(this.value) == ''){
                $(this).parent().parent().parent().remove() // remove if empty
            } else {
                $(this).prev().html(this.value);
            }
        $(this).hide();
        $(this).prev().show();
        }
	});
}


// convert todo's into JSON string
function JSONSerializeToDoItems() {
	let json_data = []
	$("#sortable li.todo-item" ).each(function( index ) {
	    let id_ = $(this).attr('id')
		json_data.push({
			id: id_ != '' && !isNaN(id_)  ? parseInt(id_) : null,
			is_completed: $(this).find('input[type=checkbox]').is(':checked'),
			text: $(this).find('input[type=text]').val(),
			order: index
		})
	})
	return JSON.stringify(json_data)
}

// disable/enable buttons based on changes in todo list
function ToggleSaveDiscardButtons(initial_todos, force_disable = false){
	not_changed = initial_todos === JSONSerializeToDoItems()
	if ( not_changed || force_disable ){
		$( "#save_btn" ).prop( "disabled", true );
		$( "#discard_btn" ).prop( "disabled", true );
	// altered state
	} else {
		$( "#save_btn" ).prop( "disabled", false );
		$( "#discard_btn" ).prop( "disabled", false );
	}
}

// insert new todo before all old todo's
function InsertToDo(id, is_completed, text, prepend=false){
	var html = `
		<li id="${id ? id : ''}" class="list-group-item todo-item">
			<div class="form-check">
				<input  class="form-check-input big-checkbox" type="checkbox" ${ is_completed ? 'checked' : '' }>
				<h2>
					<div class="edit">${text}</div>
					<input class="hidden todo-item" type="text" value="${text}">
				</h2>
			</div>
		</li>
	`;
	if (prepend) {
		$("#sortable").prepend(html)
	} else {
        $("#sortable").append(html)
	}
	$("#new-todo-form").find('input').val('');
}

function PopulateToDoList(initial_todos) {
    $("#sortable").empty();
    let parsed = JSON.parse(initial_todos)
    if (parsed != '[]') {
        parsed.forEach(function(data, index) {
            InsertToDo(data.id, data.is_completed, data.text)
        })
    }
}

function FetchTodos() {
     $.ajax({
        url: '/todos',
        type: 'get',
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        async: false
    }).done(function (data) {
        let initial_todos_ = JSON.stringify(data)
        PopulateToDoList(initial_todos_)
        ToggleSaveDiscardButtons(initial_todos_, true) // force disable due to generated id's from database
        SortAndEdit() // apply for newly created elements
        $('#toast-success').toast('show')
        toasts_toggle('success')
    }).fail(function (jqXHR, textStatus, errorThrown) {
        toasts_toggle('error')
    });
}

function toasts_toggle(name) {
    if (name === 'error') {
        $('#toast-success').toast('hide')
        $('#toast-discard').toast('hide')
        $('#toast-error').toast('show')
    } else if (name === 'success') {
        $('#toast-discard').toast('hide')
        $('#toast-error').toast('hide')
        $('#toast-success').toast('show')
    } else if (name === 'discard') {
        $('#toast-success').toast('hide')
        $('#toast-error').toast('hide')
        $('#toast-discard').toast('show')
    }
}

$( document ).ready(function() {

    //init
    FetchTodos()
	var initial_todos = JSONSerializeToDoItems()

	// when task form submited
	$("#new-todo-form").submit(function(e){
		e.preventDefault();
		var todo_text = $(this).find('input').val()
		// skip empty
		if (todo_text === '') {
			return
		}
		InsertToDo(false, false, todo_text, prepend=true)
        SortAndEdit() // apply for newly created elements
		ToggleSaveDiscardButtons(initial_todos)
		e.preventDefault();
	});

	// when tasks sorted
	$("#sortable").sortable({
		update: function( event, ui ) {
			ToggleSaveDiscardButtons(initial_todos)
		}
	});

	//when task was edited
	$("#sortable").change(function(e){
	    ToggleSaveDiscardButtons(initial_todos)
	})

    //when task was deleted
	$("#sortable li.todo-item").on("remove", function () {
		ToggleSaveDiscardButtons(initial_todos)
    })

    // save/persist to database
	$("#save_btn").click(function() {
        $.ajax({
            url: '/todos',
            type: 'post',
            data: JSONSerializeToDoItems(),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            async: false
        }).done(function (data) {
            initial_todos = JSON.stringify(data)
            PopulateToDoList(initial_todos)
            ToggleSaveDiscardButtons(initial_todos, true) // force disable due to generated id's from database
            SortAndEdit() // apply for newly created elements
            toasts_toggle('success')
        }).fail(function (jqXHR, textStatus, errorThrown) {
            toasts_toggle('error')
        })
	})

    // discard/reset todolist to the last update from the server
	$("#discard_btn").click(function() {
        PopulateToDoList(initial_todos)
        SortAndEdit() // apply for newly created elements
        ToggleSaveDiscardButtons(initial_todos)
//        ToggleSaveDiscardButtons(initial_todos, true)
        toasts_toggle('discard')
	});

});